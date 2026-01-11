import { Injectable, NotFoundException } from '@nestjs/common';
import { RepaymentScheduleDetail } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepaymentScheduleItemResponse } from './dto/response/reschedule-payment-item.response';
import { LoanSimulationScheduleItem } from '../loan-simulations/dto/response/loan-simulation.response';
import { BaseResult } from 'src/common/dto/base.response';

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

  /**
   * Get overdue repayment items for debt collection (Call List)
   * Used by staff to identify customers who need to be contacted
   */
  async getOverdueItems(query: {
    minDaysOverdue?: number;
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | '';
  }): Promise<BaseResult<RepaymentScheduleItemResponse[]>> {
    const {
      minDaysOverdue = 1,
      page = 1,
      limit = 20,
      search,
      sortBy,
      sortOrder = 'asc',
    } = query;

    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - minDaysOverdue);

    const where: any = {
      status: 'OVERDUE' as const,
      dueDate: {
        lte: cutoffDate, // Due date must be at least minDaysOverdue ago
      },
    };

    // Add search filter for customer name or phone
    if (search) {
      where.loan = {
        customer: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { nationalId: { contains: search } },
          ],
        },
      };
    }

    // Build orderBy based on sortBy and sortOrder
    const orderBy: any[] = [];
    if (sortBy && sortOrder) {
      // Map common sort fields
      const sortFieldMap: Record<string, any> = {
        dueDate: { dueDate: sortOrder },
        periodNumber: { periodNumber: sortOrder },
        totalAmount: { totalAmount: sortOrder },
        customerName: { loan: { customer: { fullName: sortOrder } } },
      };
      orderBy.push(sortFieldMap[sortBy] || { dueDate: 'asc' });
    } else {
      // Default: oldest overdue first (priority)
      orderBy.push({ dueDate: 'asc' });
      orderBy.push({ periodNumber: 'asc' });
    }

    // Get total count and items in parallel
    const [totalItems, items] = await Promise.all([
      this.prisma.repaymentScheduleDetail.count({ where }),
      this.prisma.repaymentScheduleDetail.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          loan: {
            select: {
              id: true,
              customer: {
                select: {
                  fullName: true,
                  phone: true,
                  nationalId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const mappedItems = items.map((item) => {
      const baseItem = this.mapItem(item);
      // Add customer info for call list (cast to any to avoid type conflicts)
      return {
        ...baseItem,
        customerInfo: (item as any).loan.customer,
        daysOverdue: Math.floor(
          (today.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      } as any;
    });

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
