import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { ListPaymentsQuery } from './dto/request/payment.query';
import { BaseResult } from 'src/common/dto/base.response';
import { PaymentListItem } from './dto/response/payment-list-item.repsonse';

import { PaymentRequestDto } from './dto/request/payment.request';
import { PaymentResponse } from './dto/response/payment-details.response';
import {
  PaymentComponent,
  PaymentMethod,
  PaymentType,
  Prisma,
  RepaymentItemStatus,
  RevenueType,
} from 'generated/prisma';
import { ReminderProcessor } from '../communication/reminder.processor';
import { CommunicationService } from '../communication/communication.service';

interface AllocationDraft {
  componentType: PaymentComponent;
  periodNumber: number;
  amount: number;
  note?: string;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderProcessor: ReminderProcessor,
    private readonly communicationService: CommunicationService,
  ) {}

  private async generatePaymentReferenceCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await tx.paymentSequence.upsert({
      where: { year },
      create: { year, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `PAY-${year}-${sequence.value.toString().padStart(6, '0')}`;
  }

  async listPayments(
    query: ListPaymentsQuery,
  ): Promise<BaseResult<PaymentListItem[]>> {
    // Vì @Query trả về string nên tự ép kiểu an toàn
    const page = query.page ? Number(query.page) || 1 : 1;
    const limit = query.limit ? Number(query.limit) || 20 : 20;

    const {
      loanId,
      storeId,
      paymentMethod,
      paymentType,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.LoanPaymentWhereInput = {};

    if (loanId) where.loanId = loanId;
    if (storeId) where.storeId = storeId;
    if (paymentMethod) where.paymentMethod = paymentMethod as PaymentMethod;
    if (paymentType) where.paymentType = paymentType as PaymentType;

    if (dateFrom || dateTo) {
      where.paidAt = {};
      if (dateFrom) {
        (where.paidAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1); // inclusive dateTo
        (where.paidAt as Prisma.DateTimeFilter).lt = to;
      }
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount !== undefined) {
        (where.amount as Prisma.DecimalFilter).gte = minAmount;
      }
      if (maxAmount !== undefined) {
        (where.amount as Prisma.DecimalFilter).lte = maxAmount;
      }
    }

    if (search && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        {
          referenceCode: {
            contains: s,
            mode: 'insensitive',
          },
        },
        {
          loanId: {
            equals: s,
          },
        },
        {
          loan: {
            customer: {
              OR: [
                { fullName: { contains: s, mode: 'insensitive' } },
                { phone: { contains: s } },
                { nationalId: { contains: s } },
              ],
            },
          },
        },
      ];
    }

    // sortBy whitelist
    let orderByField: keyof Prisma.LoanPaymentOrderByWithRelationInput =
      'paidAt';
    if (sortBy === 'amount') orderByField = 'amount';
    if (sortBy === 'createdAt') orderByField = 'createdAt';
    if (sortBy === 'paidAt') orderByField = 'paidAt';

    const direction: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.loanPayment.findMany({
        where,
        orderBy: { [orderByField]: direction },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          loan: {
            select: {
              customer: {
                select: {
                  fullName: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.loanPayment.count({ where }),
    ]);

    const mappedItems: PaymentListItem[] = items.map((p) => ({
      id: p.id,
      loanId: p.loanId,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod as PaymentMethod,
      paymentType: p.paymentType as PaymentType,
      paidAt: p.paidAt.toISOString(),
      referenceCode: p.referenceCode,
      customerName: (p as any).loan?.customer?.fullName,
      customerPhone: (p as any).loan?.customer?.phone,
    }));

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: mappedItems,
      meta: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async createPayment(
    idempotencyKey: string,
    payload: PaymentRequestDto,
    employee: any,
  ): Promise<BaseResult<PaymentResponse>> {
    const { loanId, amount, paymentMethod, paymentType, notes } = payload;

    if (!idempotencyKey)
      throw new ConflictException('Idempotency-Key is required');

    const existing = await this.prisma.loanPayment.findFirst({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        'Duplicate payment (Idempotency-Key already used)',
      );

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: { id: true, loanCode: true, status: true, storeId: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status === 'CLOSED')
      throw new ConflictException('Loan is already closed');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Load schedule outstanding
      const scheduleItems = await tx.repaymentScheduleDetail.findMany({
        where: {
          loanId,
          status: {
            in: [RepaymentItemStatus.PENDING, RepaymentItemStatus.OVERDUE],
          },
        },
        orderBy: [{ dueDate: 'asc' }, { periodNumber: 'asc' }],
      });

      if (scheduleItems.length === 0) {
        throw new UnprocessableEntityException(
          'No outstanding schedule items to pay',
        );
      }

      const earliest = scheduleItems[0];

      // 2) Determine allocatable items based on payment type
      let allocatableItems;
      let maxAllocatable = 0;

      if (paymentType === PaymentType.PERIODIC) {
        // PERIODIC: Only allow payment to earliest period (can be partial)
        allocatableItems = [earliest];
        maxAllocatable = this.calcTotalOutstanding([earliest]);
      } else if (paymentType === PaymentType.EARLY) {
        // EARLY: Allow payment to multiple periods sequentially, but not beyond what's owed
        allocatableItems = scheduleItems;
        maxAllocatable = this.calcTotalOutstanding(scheduleItems);
      } else if (paymentType === PaymentType.PAYOFF) {
        // PAYOFF: Must pay ALL outstanding exactly (with small tolerance for rounding)
        allocatableItems = scheduleItems;
        const totalOutstandingAll = this.calcTotalOutstanding(scheduleItems);
        const payoffDiff = Number(amount) - totalOutstandingAll;

        if (Math.abs(payoffDiff) > 1) {
          if (payoffDiff < 0) {
            // Trả thiếu
            throw new UnprocessableEntityException(
              `PAYOFF yêu cầu thanh toán đủ số nợ còn lại = ${Math.round(totalOutstandingAll)} VND. Số tiền bạn trả: ${Math.round(Number(amount))} VND (thiếu ${Math.round(Math.abs(payoffDiff))} VND)`,
            );
          } else {
            // Trả dư
            throw new UnprocessableEntityException(
              `PAYOFF yêu cầu thanh toán đúng số nợ còn lại = ${Math.round(totalOutstandingAll)} VND. Số tiền bạn trả: ${Math.round(Number(amount))} VND (dư ${Math.round(payoffDiff)} VND)`,
            );
          }
        }
        maxAllocatable = totalOutstandingAll;
      } else {
        // ADJUSTMENT: Allow any amount up to total outstanding
        allocatableItems = scheduleItems;
        maxAllocatable = this.calcTotalOutstanding(scheduleItems);
      }

      // 3) Validate amount does not exceed what can be allocated
      if (
        paymentType !== PaymentType.PAYOFF &&
        Number(amount) > maxAllocatable
      ) {
        throw new UnprocessableEntityException(
          `Payment amount (${Math.round(Number(amount))}) exceeds allocatable outstanding (${Math.round(maxAllocatable)}) for ${paymentType} payment type`,
        );
      }

      // 4) Generate reference code and create payment header
      const referenceCode = await this.generatePaymentReferenceCode(tx);

      let payment;
      try {
        payment = await tx.loanPayment.create({
          data: {
            loanId,
            storeId: loan.storeId,
            amount,
            paymentType,
            paymentMethod: paymentMethod as unknown as PaymentMethod,
            referenceCode,
            idempotencyKey,
            recorderEmployeeId: employee.id,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          throw new ConflictException(
            'Duplicate payment (Idempotency-Key already used)',
          );
        }
        throw e;
      }

      // 5) Allocate
      let remainingAmount = Math.round(Number(amount));
      const allocations: AllocationDraft[] = [];

      for (const period of allocatableItems) {
        if (remainingAmount <= 0) break;

        const interestOut = Math.round(
          Number(period.interestAmount) - Number(period.paidInterest ?? 0),
        );
        const feeOut = Math.round(
          Number(period.feeAmount) - Number(period.paidFee ?? 0),
        );

        const penaltyAmount = Math.round(
          Number((period as any).penaltyAmount ?? 0),
        );
        const paidPenalty = Math.round(
          Number((period as any).paidPenalty ?? 0),
        );
        const penaltyOut = penaltyAmount - paidPenalty;

        const principalOut = Math.round(
          Number(period.principalAmount) - Number(period.paidPrincipal ?? 0),
        );

        let payInterest = 0,
          payFee = 0,
          payLateFee = 0,
          payPrincipal = 0;

        // Waterfall: INTEREST -> FEE -> LATE_FEE -> PRINCIPAL
        if (interestOut > 0 && remainingAmount > 0) {
          payInterest = Math.round(Math.min(remainingAmount, interestOut));
          remainingAmount -= payInterest;
          allocations.push({
            componentType: PaymentComponent.INTEREST,
            periodNumber: period.periodNumber,
            amount: payInterest,
            note: notes,
          });
        }

        if (feeOut > 0 && remainingAmount > 0) {
          payFee = Math.round(Math.min(remainingAmount, feeOut));
          remainingAmount -= payFee;
          allocations.push({
            componentType: PaymentComponent.SERVICE_FEE,
            periodNumber: period.periodNumber,
            amount: payFee,
            note: notes,
          });
        }

        if (penaltyOut > 0 && remainingAmount > 0) {
          payLateFee = Math.round(Math.min(remainingAmount, penaltyOut));
          remainingAmount -= payLateFee;
          allocations.push({
            componentType: PaymentComponent.LATE_FEE,
            periodNumber: period.periodNumber,
            amount: payLateFee,
            note: notes,
          });
        }

        if (principalOut > 0 && remainingAmount > 0) {
          payPrincipal = Math.round(Math.min(remainingAmount, principalOut));
          remainingAmount -= payPrincipal;
          allocations.push({
            componentType: PaymentComponent.PRINCIPAL,
            periodNumber: period.periodNumber,
            amount: payPrincipal,
            note: notes,
          });
        }

        // update item once
        if (payInterest + payFee + payLateFee + payPrincipal > 0) {
          const newPaidInterest =
            Number(period.paidInterest ?? 0) + payInterest;
          const newPaidFee = Number(period.paidFee ?? 0) + payFee;
          const newPaidPrincipal =
            Number(period.paidPrincipal ?? 0) + payPrincipal;

          const updateData: any = {
            paidInterest: newPaidInterest,
            paidFee: newPaidFee,
            paidPrincipal: newPaidPrincipal,
          };

          if ((period as any).paidPenalty !== undefined) {
            updateData.paidPenalty = paidPenalty + payLateFee;
          }

          const fullyPaid =
            Number(period.interestAmount) - newPaidInterest <= 0 &&
            Number(period.feeAmount) - newPaidFee <= 0 &&
            ((period as any).penaltyAmount !== undefined
              ? penaltyAmount - (paidPenalty + payLateFee) <= 0
              : true) &&
            Number(period.principalAmount) - newPaidPrincipal <= 0;

          if (fullyPaid) {
            updateData.status = RepaymentItemStatus.PAID;
            updateData.paidAt = new Date();
          }

          await tx.repaymentScheduleDetail.update({
            where: { id: period.id },
            data: updateData,
          });
        }
      }

      // 6) Verify all payment was allocated (should not have remainder for any type)
      if (remainingAmount > 1) {
        // Allow 1 VND rounding tolerance
        throw new UnprocessableEntityException(
          `Payment allocation failed: ${remainingAmount} VND could not be allocated. This should not happen - please contact support.`,
        );
      }

      // 7) Save allocations
      await tx.paymentAllocation.createMany({
        data: allocations.map((a) => ({
          paymentId: payment.id,
          componentType: a.componentType as any,
          amount: a.amount,
          note: a.note,
        })),
      });

      // 7.1) Record revenue in ledger
      await this.recordRevenueFromAllocations(
        tx,
        payment.id,
        loanId,
        loan.storeId,
        allocations,
      );

      // 8) Recompute loan remaining + close if 0
      const allSchedule = await tx.repaymentScheduleDetail.findMany({
        where: { loanId },
      });

      const balance = this.recalcLoanBalance(allSchedule);

      const wasClosedBefore = loan.status === 'CLOSED';
      const isNowClosed = balance.totalRemaining <= 0;

      await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingAmount: balance.totalRemaining,
          ...(balance.totalRemaining <= 0 ? { status: 'CLOSED' } : {}),
        },
      });

      if (isNowClosed && !wasClosedBefore) {
        // audit log
        await tx.auditLog.create({
          data: {
            action: 'CLOSE_LOAN',
            entityId: loanId,
            entityType: 'LOAN',
            entityName: `${loan.loanCode}`,
            actorId: null,
            oldValue: {
              status: loan.status,
            },
            newValue: {
              status: 'CLOSED',
            },
            description: `Khoản vay ${loan.loanCode} đã được đóng khi thanh toán hết dư nợ.`,
          },
        });
      }

      // 8.1) Validate balance consistency (auto-heal if needed)
      // Pass allSchedule to avoid redundant query
      await this.validateAndReconcileLoanBalance(tx, loanId, allSchedule);

      // ✅ 8.2) CREATE AUDIT LOG HERE
      await tx.auditLog.create({
        data: {
          action: 'CREATE_PAYMENT',
          entityId: payment.id,
          entityType: 'LOAN_PAYMENT',
          entityName: `Thanh toán - ${loan.loanCode} ${payment.referenceCode ?? '(' + payment.referenceCode + ')'}`,
          actorId: employee.id,
          actorName: employee.name,
          newValue: {
            loanId: loanId,
            loanCode: loan.loanCode,
            amount: Number(amount),
            paymentType: paymentType,
            paymentMethod: paymentMethod,
          },
          description: `Thanh toán ${Math.round(
            Number(amount),
          )} VND cho khoản vay ${loan.loanCode}`,
        },
      });

      // 9) Next payment
      const next = await tx.repaymentScheduleDetail.findFirst({
        where: {
          loanId,
          status: {
            in: [RepaymentItemStatus.PENDING, RepaymentItemStatus.OVERDUE],
          },
        },
        orderBy: [{ dueDate: 'asc' }, { periodNumber: 'asc' }],
      });

      const nextPayment = next
        ? {
            dueDate: next.dueDate.toISOString().slice(0, 10),
            amount: Math.round(Number(next.totalAmount)),
            periodNumber: next.periodNumber,
          }
        : { dueDate: null, amount: null, periodNumber: null };

      return { payment, allocations, balance, nextPayment, allSchedule };
    });

    // Cancel scheduled reminders for periods that were fully paid
    try {
      const paidPeriods = result.allSchedule
        .filter((period) => period.status === RepaymentItemStatus.PAID)
        .map((period) => period.periodNumber);

      if (paidPeriods.length > 0) {
        await this.reminderProcessor.cancelRemindersForPayments(
          loanId,
          paidPeriods,
        );
      }
    } catch (error) {
      // Log error but don't fail the payment
      console.error('Failed to cancel scheduled reminders:', error);
    }

    // Send payment confirmation notification
    try {
      await this.communicationService.schedulePaymentConfirmation(
        loanId,
        result.payment.id,
        amount,
        result.allocations.map((a) => ({
          periodNumber: a.periodNumber,
          component: a.componentType,
          amount: Math.round(a.amount),
        })),
      );
    } catch (error) {
      // Log error but don't fail the payment
      console.error('Failed to send payment confirmation:', error);
    }

    return {
      data: {
        transactionId: result.payment.id,
        loanId,
        amount,
        paymentMethod: result.payment.paymentMethod,
        paymentType: result.payment.paymentType as any,
        paidAt: result.payment.paidAt.toISOString(),
        allocation: result.allocations.map((a) => ({
          periodNumber: a.periodNumber,
          component: a.componentType,
          amount: Math.round(a.amount),
          description: this.buildAllocationDescription(a),
        })),
        loanBalance: result.balance,
        nextPayment: result.nextPayment,
        message: 'Payment processed successfully',
      },
    };
  }

  // ===== helpers =====
  private calcTotalOutstanding(items: any[]): number {
    let total = 0;
    for (const p of items) {
      total += Math.round(
        Math.max(0, Number(p.interestAmount) - Number(p.paidInterest ?? 0)),
      );
      total += Math.round(
        Math.max(0, Number(p.feeAmount) - Number(p.paidFee ?? 0)),
      );
      total += Math.round(
        Math.max(0, Number(p.principalAmount) - Number(p.paidPrincipal ?? 0)),
      );

      if ((p as any).penaltyAmount !== undefined) {
        total += Math.round(
          Math.max(
            0,
            Number((p as any).penaltyAmount ?? 0) -
              Number((p as any).paidPenalty ?? 0),
          ),
        );
      }
    }
    return total;
  }

  private recalcLoanBalance(allSchedule: any[]) {
    let remainingPrincipal = 0;
    let remainingInterest = 0;
    let remainingFees = 0;
    let remainingPenalty = 0;

    for (const p of allSchedule) {
      remainingPrincipal += Math.round(
        Math.max(0, Number(p.principalAmount) - Number(p.paidPrincipal ?? 0)),
      );
      remainingInterest += Math.round(
        Math.max(0, Number(p.interestAmount) - Number(p.paidInterest ?? 0)),
      );
      remainingFees += Math.round(
        Math.max(0, Number(p.feeAmount) - Number(p.paidFee ?? 0)),
      );

      if ((p as any).penaltyAmount !== undefined) {
        remainingPenalty += Math.round(
          Math.max(
            0,
            Number((p as any).penaltyAmount ?? 0) -
              Number((p as any).paidPenalty ?? 0),
          ),
        );
      }
    }

    return {
      remainingPrincipal: Math.round(remainingPrincipal),
      remainingInterest: Math.round(remainingInterest),
      remainingFees: Math.round(remainingFees),
      remainingPenalty: Math.round(remainingPenalty),
      totalRemaining:
        remainingPrincipal +
        remainingInterest +
        remainingFees +
        remainingPenalty,
    };
  }

  /**
   * Validates and reconciles loan balance against schedule items.
   * If discrepancy detected, automatically heals by trusting calculated value.
   * @param tx - Transaction context
   * @param loanId - Loan ID to validate
   * @param scheduleItems - Optional pre-fetched schedule items (optimization)
   */
  private async validateAndReconcileLoanBalance(
    tx: any,
    loanId: string,
    scheduleItems?: any[],
  ): Promise<void> {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      select: { remainingAmount: true },
    });

    // Reuse scheduleItems if provided to avoid redundant query
    const items =
      scheduleItems ??
      (await tx.repaymentScheduleDetail.findMany({
        where: { loanId },
      }));

    const calculatedBalance = this.recalcLoanBalance(items);
    const calculatedTotal = calculatedBalance.totalRemaining;
    const storedRemaining = Math.round(Number(loan.remainingAmount));

    // Allow small rounding tolerance (5 VND)
    const diff = Math.abs(calculatedTotal - storedRemaining);

    if (diff > 5) {
      // TODO: Replace console with proper logger (Winston/Pino) for production
      console.warn(
        `⚠️ Loan balance mismatch detected for ${loanId}:`,
        `stored=${storedRemaining}, calculated=${calculatedTotal}, diff=${diff}`,
      );

      // Auto-heal: trust the calculated value from schedule (source of truth)
      await tx.loan.update({
        where: { id: loanId },
        data: { remainingAmount: calculatedTotal },
      });

      console.log(
        `✅ Auto-healed loan ${loanId} balance to ${calculatedTotal}`,
      );
    }
  }

  private buildAllocationDescription(a: AllocationDraft): string {
    switch (a.componentType) {
      case PaymentComponent.INTEREST:
        return `Interest for period ${a.periodNumber}`;
      case PaymentComponent.SERVICE_FEE:
        return `Service fee for period ${a.periodNumber}`;
      case PaymentComponent.LATE_FEE:
        return `Late fee for period ${a.periodNumber}`;
      case PaymentComponent.PRINCIPAL:
        return `Principal for period ${a.periodNumber}`;
      default:
        return `Payment for period ${a.periodNumber}`;
    }
  }

  /**
   * Record revenue in ledger from payment allocations
   * Only revenue-generating components are recorded: INTEREST, SERVICE_FEE, LATE_FEE
   * PRINCIPAL is not revenue - it's loan repayment
   */
  private async recordRevenueFromAllocations(
    tx: any,
    paymentId: string,
    loanId: string,
    storeId: string,
    allocations: AllocationDraft[],
  ): Promise<void> {
    const revenueEntries: Array<{
      type: RevenueType;
      amount: number;
      refId: string;
      storeId: string;
    }> = [];

    for (const allocation of allocations) {
      let revenueType: RevenueType | null = null;

      // Map payment component to revenue type
      switch (allocation.componentType) {
        case PaymentComponent.INTEREST:
          revenueType = RevenueType.INTEREST;
          break;
        case PaymentComponent.SERVICE_FEE:
          revenueType = RevenueType.SERVICE_FEE;
          break;
        case PaymentComponent.LATE_FEE:
          revenueType = RevenueType.LATE_FEE;
          break;
        case PaymentComponent.PRINCIPAL:
          // Principal is not revenue - skip
          continue;
      }

      if (revenueType && allocation.amount > 0) {
        revenueEntries.push({
          type: revenueType,
          amount: allocation.amount,
          refId: paymentId,
          storeId: storeId,
        });
      }
    }

    // Batch insert revenue entries
    if (revenueEntries.length > 0) {
      await tx.revenueLedger.createMany({
        data: revenueEntries,
      });

      console.log(
        `📊 Recorded ${revenueEntries.length} revenue entries for payment ${paymentId}, loan ${loanId}, store ${storeId}`,
      );
    }
  }
}
