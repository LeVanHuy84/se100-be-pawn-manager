import { Injectable, NotFoundException } from '@nestjs/common';
import { RepaymentItemStatus, RepaymentScheduleDetail } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepaymentScheduleItemResponse } from './dto/response/reschedule-payment-item.response';
import { LoanSimulationScheduleItem } from '../loan-simulations/dto/response/loan-simulation.response';
import { BaseResult } from 'src/common/dto/base.response';
import { OverdueLoanResponse } from './dto/response/overdue-loan.response';
import { OverdueLoansQuery } from './dto/request/overdue-items.query';

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
  ): Promise<BaseResult<RepaymentScheduleItemResponse[]>> {
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

    return {
      data: items.map((item) => this.mapItem(item)),
    };
  }

  async getRepaymentScheduleItem(
    id: string,
  ): Promise<BaseResult<RepaymentScheduleItemResponse>> {
    const item = await this.prisma.repaymentScheduleDetail.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Repayment schedule item not found');
    }

    return {
      data: this.mapItem(item),
    };
  }

  /**
   * Get overdue repayment items for debt collection (Call List)
   * Used by staff to identify customers who need to be contacted
   */
  async getOverdueLoans(
    query: OverdueLoansQuery,
  ): Promise<BaseResult<OverdueLoanResponse[]>> {
    const {
      startDate,
      endDate,
      storeId,
      page = 1,
      limit = 20,
      search,
      sortBy,
      sortOrder = 'asc',
    } = query;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Parse string dates to Date objects for database query
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    // Build where clause for loans with overdue items
    const loanWhere: any = {
      status: { in: ['ACTIVE', 'OVERDUE'] },
      repaymentSchedule: {
        some: {
          status: RepaymentItemStatus.OVERDUE,
          ...(startDateObj && {
            dueDate: { gte: startDateObj },
          }),
          ...(endDateObj && {
            dueDate: { lte: endDateObj },
          }),
        },
      },
    };

    if (storeId) {
      loanWhere.storeId = storeId;
    }

    if (search) {
      loanWhere.OR = [
        { loanCode: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
        { customer: { nationalId: { contains: search } } },
      ];
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (sortBy === 'earliestOverdueDate') {
      // Sort by earliest overdue date (requires aggregation, use default)
      orderBy.push({ createdAt: sortOrder || 'asc' });
    } else if (sortBy === 'loanCode') {
      orderBy.push({ loanCode: sortOrder || 'asc' });
    } else if (sortBy === 'customerName') {
      orderBy.push({ customer: { fullName: sortOrder || 'asc' } });
    } else {
      // Default: sort by loan creation (newest first for active management)
      orderBy.push({ createdAt: 'desc' });
    }

    // Get total count and loans in parallel
    const [totalItems, loans] = await Promise.all([
      this.prisma.loan.count({ where: loanWhere }),
      this.prisma.loan.findMany({
        where: loanWhere,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: {
              fullName: true,
              phone: true,
              nationalId: true,
            },
          },
          repaymentSchedule: {
            where: {
              status: RepaymentItemStatus.OVERDUE,
              ...(startDateObj && { dueDate: { gte: startDateObj } }),
              ...(endDateObj && { dueDate: { lte: endDateObj } }),
            },
            orderBy: [{ dueDate: 'asc' }, { periodNumber: 'asc' }],
          },
        },
      }),
    ]);

    // Map loans to response format
    const mappedLoans: OverdueLoanResponse[] = loans.map((loan) => {
      const overdueItems = loan.repaymentSchedule;
      const earliestOverdueDate =
        overdueItems.length > 0 ? overdueItems[0].dueDate : new Date();

      const totalOverdueAmount = overdueItems.reduce((sum, item) => {
        const principalOut =
          Number(item.principalAmount) - Number(item.paidPrincipal ?? 0);
        const interestOut =
          Number(item.interestAmount) - Number(item.paidInterest ?? 0);
        const feeOut = Number(item.feeAmount) - Number(item.paidFee ?? 0);
        const penaltyOut =
          Number(item.penaltyAmount ?? 0) - Number(item.paidPenalty ?? 0);
        return sum + principalOut + interestOut + feeOut + penaltyOut;
      }, 0);

      const daysOverdue = Math.floor(
        (today.getTime() - earliestOverdueDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return {
        loanId: loan.id,
        loanCode: loan.loanCode,
        loanStatus: loan.status,
        customer: {
          fullName: loan.customer.fullName,
          phone: loan.customer.phone || '',
          nationalId: loan.customer.nationalId,
        },
        totalOverdueAmount: Math.round(totalOverdueAmount),
        overduePeriodsCount: overdueItems.length,
        earliestOverdueDate: earliestOverdueDate.toISOString().slice(0, 10),
        daysOverdue,
        overdueItems: overdueItems.map((item) => this.mapItem(item)),
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: mappedLoans,
      meta: {
        totalItems: totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

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
      // Include items that are past due even if cron hasn't marked them OVERDUE yet
      status: {
        in: [RepaymentItemStatus.OVERDUE, RepaymentItemStatus.PENDING],
      },
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
