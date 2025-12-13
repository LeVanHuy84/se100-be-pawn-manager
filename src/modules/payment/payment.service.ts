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
} from 'generated/prisma';

interface AllocationDraft {
  componentType: PaymentComponent;
  periodNumber: number;
  amount: number;
  note?: string;
}

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async listPayments(
    query: ListPaymentsQuery,
  ): Promise<BaseResult<PaymentListItem[]>> {
    // Vì @Query trả về string nên tự ép kiểu an toàn
    const page = query.page ? Number(query.page) || 1 : 1;
    const limit = query.limit ? Number(query.limit) || 20 : 20;

    const {
      loanId,
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
    employeeId: string,
  ): Promise<PaymentResponse> {
    const { loanId, amount, paymentMethod, paymentType, referenceCode, notes } =
      payload;

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
      select: { id: true, status: true },
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

      // 2) Nếu PERIODIC: chỉ cho trả trong 1 kỳ (earliest)
      const allocatableItems =
        paymentType === PaymentType.PERIODIC ? [earliest] : scheduleItems; // EARLY/PAYOFF/ADJUSTMENT -> full list

      // 3) Nếu PAYOFF: amount phải = totalOutstanding (không dư/không thiếu)
      const totalOutstandingAll = this.calcTotalOutstanding(scheduleItems);
      if (paymentType === PaymentType.PAYOFF) {
        // bạn có thể cho phép lệch nhỏ do rounding, nhưng hiện tại reject strict
        if (Number(amount) !== totalOutstandingAll) {
          throw new UnprocessableEntityException(
            `PAYOFF requires exact outstanding amount = ${Math.round(totalOutstandingAll)}`,
          );
        }
      }

      // 4) Create payment header
      let payment;
      try {
        payment = await tx.loanPayment.create({
          data: {
            loanId,
            amount,
            paymentType, // ✅ dùng theo request
            paymentMethod: paymentMethod as unknown as PaymentMethod,
            referenceCode,
            idempotencyKey,
            recorderEmployeeId: employeeId,
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
      let remainingAmount = Number(amount);
      const allocations: AllocationDraft[] = [];

      for (const period of allocatableItems) {
        if (remainingAmount <= 0) break;

        const interestOut =
          Number(period.interestAmount) - Number(period.paidInterest ?? 0);
        const feeOut = Number(period.feeAmount) - Number(period.paidFee ?? 0);

        const penaltyAmount = Number((period as any).penaltyAmount ?? 0);
        const paidPenalty = Number((period as any).paidPenalty ?? 0);
        const penaltyOut = penaltyAmount - paidPenalty;

        const principalOut =
          Number(period.principalAmount) - Number(period.paidPrincipal ?? 0);

        let payInterest = 0,
          payFee = 0,
          payPenalty = 0,
          payPrincipal = 0;

        // Waterfall: INTEREST -> FEE -> PENALTY -> PRINCIPAL
        if (interestOut > 0 && remainingAmount > 0) {
          payInterest = Math.min(remainingAmount, interestOut);
          remainingAmount -= payInterest;
          allocations.push({
            componentType: PaymentComponent.INTEREST,
            periodNumber: period.periodNumber,
            amount: payInterest,
            note: notes,
          });
        }

        if (feeOut > 0 && remainingAmount > 0) {
          payFee = Math.min(remainingAmount, feeOut);
          remainingAmount -= payFee;
          allocations.push({
            componentType: PaymentComponent.SERVICE_FEE,
            periodNumber: period.periodNumber,
            amount: payFee,
            note: notes,
          });
        }

        if (penaltyOut > 0 && remainingAmount > 0) {
          payPenalty = Math.min(remainingAmount, penaltyOut);
          remainingAmount -= payPenalty;
          allocations.push({
            componentType: PaymentComponent.PENALTY,
            periodNumber: period.periodNumber,
            amount: payPenalty,
            note: notes,
          });
        }

        if (principalOut > 0 && remainingAmount > 0) {
          payPrincipal = Math.min(remainingAmount, principalOut);
          remainingAmount -= payPrincipal;
          allocations.push({
            componentType: PaymentComponent.PRINCIPAL,
            periodNumber: period.periodNumber,
            amount: payPrincipal,
            note: notes,
          });
        }

        // update item once
        if (payInterest + payFee + payPenalty + payPrincipal > 0) {
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
            updateData.paidPenalty = paidPenalty + payPenalty;
          }

          const fullyPaid =
            Number(period.interestAmount) - newPaidInterest <= 0 &&
            Number(period.feeAmount) - newPaidFee <= 0 &&
            ((period as any).penaltyAmount !== undefined
              ? penaltyAmount - (paidPenalty + payPenalty) <= 0
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

      // 6) Reject overpayment (strict)
      if (remainingAmount > 0) {
        throw new UnprocessableEntityException(
          'Payment amount exceeds allocatable outstanding for selected paymentType',
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

      // 8) Recompute loan remaining + close if 0
      const allSchedule = await tx.repaymentScheduleDetail.findMany({
        where: { loanId },
      });

      const balance = this.recalcLoanBalance(allSchedule);

      await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingAmount: balance.totalRemaining,
          ...(balance.totalRemaining <= 0 ? { status: 'CLOSED' } : {}),
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
            amount: Number(next.totalAmount),
            periodNumber: next.periodNumber,
          }
        : { dueDate: null, amount: null, periodNumber: null };

      return { payment, allocations, balance, nextPayment };
    });

    return {
      transactionId: result.payment.id,
      loanId,
      amount,
      paymentMethod: result.payment.paymentMethod,
      paymentType: result.payment.paymentType as any,
      paidAt: result.payment.paidAt.toISOString(),
      allocation: result.allocations.map((a) => ({
        periodNumber: a.periodNumber,
        component: a.componentType,
        amount: a.amount,
        description: this.buildAllocationDescription(a),
      })),
      loanBalance: result.balance,
      nextPayment: result.nextPayment,
      message: 'Payment processed successfully',
    };
  }

  // ===== helpers =====
  private calcTotalOutstanding(items: any[]): number {
    let total = 0;
    for (const p of items) {
      total += Math.max(
        0,
        Number(p.interestAmount) - Number(p.paidInterest ?? 0),
      );
      total += Math.max(0, Number(p.feeAmount) - Number(p.paidFee ?? 0));
      total += Math.max(
        0,
        Number(p.principalAmount) - Number(p.paidPrincipal ?? 0),
      );

      if ((p as any).penaltyAmount !== undefined) {
        total += Math.max(
          0,
          Number((p as any).penaltyAmount ?? 0) -
            Number((p as any).paidPenalty ?? 0),
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
      remainingPrincipal += Math.max(
        0,
        Number(p.principalAmount) - Number(p.paidPrincipal ?? 0),
      );
      remainingInterest += Math.max(
        0,
        Number(p.interestAmount) - Number(p.paidInterest ?? 0),
      );
      remainingFees += Math.max(
        0,
        Number(p.feeAmount) - Number(p.paidFee ?? 0),
      );

      if ((p as any).penaltyAmount !== undefined) {
        remainingPenalty += Math.max(
          0,
          Number((p as any).penaltyAmount ?? 0) -
            Number((p as any).paidPenalty ?? 0),
        );
      }
    }

    return {
      remainingPrincipal,
      remainingInterest,
      remainingFees,
      remainingPenalty,
      totalRemaining:
        remainingPrincipal +
        remainingInterest +
        remainingFees +
        remainingPenalty,
    };
  }

  private buildAllocationDescription(a: AllocationDraft): string {
    switch (a.componentType) {
      case PaymentComponent.INTEREST:
        return `Interest for period ${a.periodNumber}`;
      case PaymentComponent.SERVICE_FEE:
        return `Service fee for period ${a.periodNumber}`;
      case PaymentComponent.PENALTY:
        return `Penalty for period ${a.periodNumber}`;
      case PaymentComponent.PRINCIPAL:
        return `Principal for period ${a.periodNumber}`;
      default:
        return `Payment for period ${a.periodNumber}`;
    }
  }
}
