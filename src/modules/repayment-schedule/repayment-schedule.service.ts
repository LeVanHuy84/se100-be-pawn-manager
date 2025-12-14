import { Injectable, NotFoundException } from '@nestjs/common';
import { RepaymentScheduleDetail } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepaymentScheduleItemResponse } from './dto/response/reschedule-payment-item.response';
import { LoanSimulationScheduleItem } from '../loan-simulations/dto/response/loan-simulation.response';

@Injectable()
export class RepaymentScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async createRepaymentItemsFromSimulation(params: {
    loanId: string;
    simulationItems: LoanSimulationScheduleItem[];
    overwrite?: boolean;
  }): Promise<void> {
    const { loanId, simulationItems, overwrite = true } = params;

    // optional: validate loan tồn tại
    const loanExists = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: { id: true },
    });
    if (!loanExists) {
      throw new NotFoundException('Loan not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1️⃣ clear cũ nếu cần
      if (overwrite) {
        await tx.repaymentScheduleDetail.deleteMany({
          where: { loanId },
        });
      }

      // 2️⃣ batch insert
      await tx.repaymentScheduleDetail.createMany({
        data: simulationItems.map((item) => ({
          loanId,
          periodNumber: item.periodNumber,
          dueDate: new Date(item.dueDate),
          beginningBalance: item.beginningBalance,
          principalAmount: item.principalAmount,
          interestAmount: item.interestAmount,
          feeAmount: item.feeAmount,
          totalAmount: item.totalAmount,
          status: 'PENDING',
          paidPrincipal: 0,
          paidInterest: 0,
          paidFee: 0,
          paidAt: null,
        })),
      });
    });
  }

  async getLoanRepaymentSchedule(
    loanId: string,
  ): Promise<RepaymentScheduleItemResponse[]> {
    // 1. check loan
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: { id: true },
    });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const items = await this.prisma.repaymentScheduleDetail.findMany({
      where: { loanId },
      orderBy: [{ periodNumber: 'asc' }],
    });

    return items.map((item) => this.mapItem(item));
  }

  async getRepaymentScheduleItem(
    id: string,
  ): Promise<RepaymentScheduleItemResponse> {
    const item = await this.prisma.repaymentScheduleDetail.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Repayment schedule item not found');
    }

    return this.mapItem(item);
  }

  private mapItem(
    item: RepaymentScheduleDetail,
  ): RepaymentScheduleItemResponse {
    return {
      id: item.id,
      loanId: item.loanId,
      periodNumber: item.periodNumber,
      dueDate: item.dueDate.toISOString().slice(0, 10),
      beginningBalance: Number(item.beginningBalance),
      principalAmount: Number(item.principalAmount),
      interestAmount: Number(item.interestAmount),
      feeAmount: Number((item as any).feeAmount ?? 0),
      totalAmount: Number(item.totalAmount),
      status: item.status,
      paidPrincipal: Number(item.paidPrincipal ?? 0),
      paidInterest: Number(item.paidInterest ?? 0),
      paidFee: Number((item as any).paidFee ?? 0),
      paidAt: item.paidAt ? item.paidAt.toISOString() : null,
    };
  }
}
