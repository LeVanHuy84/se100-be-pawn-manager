import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentComponent,
  PaymentMethod,
  PaymentType,
  Prisma,
  RepaymentItemStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListPaymentsQuery } from './dto/request/payment.query';
import { BaseResult } from 'src/common/dto/base.response';
import { PaymentListItem } from './dto/response/payment-list-item.repsonse';

import { PaymentRequestDto } from './dto/request/payment.request';
import { PaymentResponse } from './dto/response/payment-details.response';

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
    const { loanId, amount, paymentMethod, referenceCode, notes } = payload;

    if (!idempotencyKey) {
      // controller nên đảm bảo required, đây chỉ là safety net
      throw new ConflictException('Idempotency-Key is required');
    }

    // 1. Check idempotency
    const existingByKey = await this.prisma.loanPayment.findFirst({
      where: { idempotencyKey },
    });

    if (existingByKey) {
      throw new ConflictException(
        'Duplicate payment (Idempotency-Key already used)',
      );
    }

    // 2. Load loan + schedule
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        repaymentSchedule: {
          orderBy: [{ dueDate: 'asc' }, { periodNumber: 'asc' }],
        },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    if (loan.status === 'CLOSED') {
      throw new ConflictException('Loan is already closed');
    }

    // 3. Start transaction: create payment + allocation + update schedule + loan
    const result = await this.prisma.$transaction(async (tx) => {
      // 3.1. Create LoanPayment
      const payment = await tx.loanPayment.create({
        data: {
          loanId,
          amount,
          paymentType: PaymentType.PERIODIC, // hoặc logic để detect
          paymentMethod: paymentMethod as PaymentMethod,
          referenceCode,
          idempotencyKey,
          recorderEmployeeId: employeeId,
        },
      });

      let remainingAmount = amount;
      const allocationsData: {
        componentType: PaymentComponent;
        amount: number;
        periodNumber: number;
        note?: string;
      }[] = [];

      // 3.2. Load latest schedule inside transaction
      const scheduleItems = await tx.repaymentScheduleDetail.findMany({
        where: {
          loanId,
          status: {
            in: [RepaymentItemStatus.PENDING, RepaymentItemStatus.OVERDUE],
          },
        },
        orderBy: [{ dueDate: 'asc' }, { periodNumber: 'asc' }],
      });

      // 3.3. Waterfall allocation (Interest -> Fee -> Principal -> Late -> Penalty)
      // NOTE: Đây là chỗ cần implement chi tiết theo business thực tế của bạn.
      //
      // Ý tưởng:
      //  - For each period:
      //      interestOutstanding = interestAmount - paidInterest
      //      principalOutstanding = principalAmount - paidPrincipal
      //      feeOutstanding = ... (tính/lookup)
      //      lateFeeOutstanding = ...
      //      penaltyOutstanding = ...
      //
      //      Rồi trừ dần remainingAmount theo thứ tự:
      //        INTEREST -> SERVICE_FEE -> PRINCIPAL -> LATE_FEE -> PENALTY
      //
      //      Ghi nhận mỗi bước vào allocationsData, update paidPrincipal/paidInterest, status, ...

      for (const period of scheduleItems) {
        if (remainingAmount <= 0) break;

        let paidInterest = Number(period.paidInterest ?? 0);
        let paidPrincipal = Number(period.paidPrincipal ?? 0);
        let paidFee = Number((period as any).paidFee ?? 0);

        const interestAmount = Number(period.interestAmount);
        const principalAmount = Number(period.principalAmount);
        const feeAmount = Number((period as any).feeAmount ?? 0);

        let interestOutstanding = interestAmount - paidInterest;
        let principalOutstanding = principalAmount - paidPrincipal;
        let feeOutstanding = feeAmount - paidFee;

        // TODO: nếu có mô hình lưu lateFee / penalty riêng, ở đây sẽ load/compute ra:
        let lateFeeOutstanding = 0;
        let penaltyOutstanding = 0;

        // 1) INTEREST
        if (interestOutstanding > 0 && remainingAmount > 0) {
          const payInterest = Math.min(remainingAmount, interestOutstanding);
          if (payInterest > 0) {
            allocationsData.push({
              componentType: PaymentComponent.INTEREST,
              periodNumber: period.periodNumber,
              amount: payInterest,
              note: notes,
            });
            remainingAmount -= payInterest;
            paidInterest += payInterest;
            interestOutstanding -= payInterest;
            await tx.repaymentScheduleDetail.update({
              where: { id: period.id },
              data: {
                paidInterest,
              },
            });
          }
        }

        // 2) SERVICE_FEE (mgmt + custody)
        if (feeOutstanding > 0 && remainingAmount > 0) {
          const payFee = Math.min(remainingAmount, feeOutstanding);
          if (payFee > 0) {
            allocationsData.push({
              componentType: PaymentComponent.SERVICE_FEE,
              periodNumber: period.periodNumber,
              amount: payFee,
              note: notes,
            });
            remainingAmount -= payFee;
            paidFee += payFee;
            feeOutstanding -= payFee;

            await tx.repaymentScheduleDetail.update({
              where: { id: period.id },
              data: {
                paidFee,
              },
            });
          }
        }

        // 3) PRINCIPAL
        if (principalOutstanding > 0 && remainingAmount > 0) {
          const payPrincipal = Math.min(remainingAmount, principalOutstanding);
          if (payPrincipal > 0) {
            allocationsData.push({
              componentType: PaymentComponent.PRINCIPAL,
              periodNumber: period.periodNumber,
              amount: payPrincipal,
              note: notes,
            });
            remainingAmount -= payPrincipal;
            paidPrincipal += payPrincipal;
            principalOutstanding -= payPrincipal;

            await tx.repaymentScheduleDetail.update({
              where: { id: period.id },
              data: {
                paidPrincipal,
              },
            });
          }
        }

        // 4) LATE_FEE
        if (lateFeeOutstanding > 0 && remainingAmount > 0) {
          const payLate = Math.min(remainingAmount, lateFeeOutstanding);
          if (payLate > 0) {
            allocationsData.push({
              componentType: PaymentComponent.LATE_FEE,
              periodNumber: period.periodNumber,
              amount: payLate,
              note: notes,
            });
            remainingAmount -= payLate;
            lateFeeOutstanding -= payLate;
            // TODO: update late fee tracking
          }
        }

        // 5) PENALTY
        if (penaltyOutstanding > 0 && remainingAmount > 0) {
          const payPen = Math.min(remainingAmount, penaltyOutstanding);
          if (payPen > 0) {
            allocationsData.push({
              componentType: PaymentComponent.PENALTY,
              periodNumber: period.periodNumber,
              amount: payPen,
              note: notes,
            });
            remainingAmount -= payPen;
            penaltyOutstanding -= payPen;
            // TODO: update penalty tracking
          }
        }

        // TODO: sau khi xử lý 1 period, nếu principal + interest + fees cho period đã đủ,
        const isFullyPaid =
          interestOutstanding <= 0 &&
          principalOutstanding <= 0 &&
          feeOutstanding <= 0 &&
          lateFeeOutstanding <= 0 &&
          penaltyOutstanding <= 0;

        if (isFullyPaid) {
          await tx.repaymentScheduleDetail.update({
            where: { id: period.id },
            data: {
              status: RepaymentItemStatus.PAID,
              paidAt: new Date(),
            },
          });
        }
      }

      // 3.4. Tạo PaymentAllocation records
      await Promise.all(
        allocationsData.map((a) =>
          tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              componentType: a.componentType,
              amount: a.amount,
              note: a.note,
            },
          }),
        ),
      );

      // 3.5. Update Loan tổng số tiền đã trả + remainingAmount
      // TODO: tính lại remainingPrincipal/remainingInterest/remainingFees từ schedule
      const allSchedule = await tx.repaymentScheduleDetail.findMany({
        where: { loanId },
      });

      let remainingPrincipal = 0;
      let remainingInterest = 0;
      let remainingFees = 0;

      for (const p of allSchedule) {
        const principalOutstanding =
          Number(p.principalAmount) - Number(p.paidPrincipal ?? 0);
        const interestOutstanding =
          Number(p.interestAmount) - Number(p.paidInterest ?? 0);
        const feeOutstanding = Number(p.feeAmount) - Number(p.paidFee ?? 0);

        if (principalOutstanding > 0) {
          remainingPrincipal += principalOutstanding;
        }
        if (interestOutstanding > 0) {
          remainingInterest += interestOutstanding;
        }
        if (feeOutstanding > 0) {
          remainingFees += feeOutstanding;
        }
      }

      const totalRemaining =
        remainingPrincipal + remainingInterest + remainingFees;

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          totalPaidAmount: Number(loan.totalPaidAmount ?? 0) + Number(amount),
          remainingAmount: totalRemaining,
          ...(totalRemaining <= 0 && { status: 'CLOSED' }),
        },
      });

      // 3.6. Tính loanBalance + nextPayment cho response
      const loanBalance = {
        totalPaidAmount: Number(updatedLoan.totalPaidAmount ?? 0),
        remainingPrincipal,
        remainingInterest,
        remainingFees,
        totalRemaining,
      };

      // tìm kỳ tiếp theo còn PENDING
      const next = await tx.repaymentScheduleDetail.findFirst({
        where: {
          loanId,
          status: RepaymentItemStatus.PENDING,
        },
        orderBy: [{ dueDate: 'asc' }, { periodNumber: 'asc' }],
      });

      const nextPayment = next
        ? {
            dueDate: next.dueDate.toISOString().slice(0, 10),
            amount: Number(next.totalAmount),
            periodNumber: next.periodNumber,
          }
        : {
            dueDate: null,
            amount: null,
            periodNumber: null,
          };

      return {
        payment,
        allocationsData,
        loanBalance,
        nextPayment,
      };
    });

    // 4. Map result -> PaymentResponse
    return {
      transactionId: result.payment.id,
      loanId,
      amount,
      paymentMethod: result.payment.paymentMethod,
      paidAt: result.payment.paidAt.toISOString(),
      allocation: result.allocationsData.map((a) => ({
        component: a.componentType,
        amount: a.amount,
        description: a.note ?? this.buildAllocationDescription(a),
      })),
      loanBalance: result.loanBalance,
      nextPayment: result.nextPayment,
      message: 'Payment processed successfully',
    };
  }

  private buildAllocationDescription(a: {
    componentType: PaymentComponent;
    periodNumber: number;
  }): string {
    const periodLabel = `period ${a.periodNumber}`;

    switch (a.componentType) {
      case PaymentComponent.INTEREST:
        return `Interest for ${periodLabel}`;
      case PaymentComponent.SERVICE_FEE:
        return `Management and custody fees for ${periodLabel}`;
      case PaymentComponent.PRINCIPAL:
        return `Principal payment for ${periodLabel}`;
      case PaymentComponent.LATE_FEE:
        return `Late fee for ${periodLabel}`;
      case PaymentComponent.PENALTY:
        return `Penalty for ${periodLabel}`;
      default:
        return `Allocation for ${periodLabel}`;
    }
  }
}
