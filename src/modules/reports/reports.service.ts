import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  RevenueReportResponse,
  RevenueReportListResponse,
} from './dto/revenue-report.response';
import { DailyLogQuery } from './dto/daily-log.query';
import { DailyLogResponse, DailyLogEntry } from './dto/daily-log.response';
import {
  QuarterlyReportQuery,
  QuarterlyReportResponse,
} from './dto/quarterly-report.dto';
import { RevenueReportQuery } from './dto/revenue-report.query';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate revenue report based on date range
   */
  async getRevenueReport(
    query: RevenueReportQuery,
  ): Promise<RevenueReportListResponse> {
    const { startDate, endDate, storeId } = query;

    // Set date range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build where clause for revenue
    const revenueWhere: any = {
      recordedAt: {
        gte: start,
        lte: end,
      },
    };

    // Build where clause for loans (expenses)
    const loanWhere: any = {
      activatedAt: {
        gte: start,
        lte: end,
      },
      status: {
        in: ['ACTIVE', 'CLOSED', 'OVERDUE'],
      },
    };

    if (storeId) {
      revenueWhere.storeId = storeId;
      loanWhere.storeId = storeId;
    }

    // Fetch revenue data
    const revenues = await this.prisma.revenueLedger.findMany({
      where: revenueWhere,
      orderBy: { recordedAt: 'asc' },
    });

    // Fetch loan disbursements (expenses)
    const loans = await this.prisma.loan.findMany({
      where: loanWhere,
      select: {
        loanAmount: true,
      },
    });

    // Calculate revenue breakdown and summary
    const breakdown = {
      interest: 0,
      serviceFee: 0,
      lateFee: 0,
      liquidationExcess: 0,
    };

    let totalRevenue = 0;

    revenues.forEach((revenue) => {
      const amount = Number(revenue.amount);
      totalRevenue += amount;

      switch (revenue.type) {
        case 'INTEREST':
          breakdown.interest += amount;
          break;
        case 'SERVICE_FEE':
          breakdown.serviceFee += amount;
          break;
        case 'LATE_FEE':
          breakdown.lateFee += amount;
          break;
        case 'LIQUIDATION_EXCESS':
          breakdown.liquidationExcess += amount;
          break;
      }
    });

    // Calculate expense breakdown
    const totalLoanDisbursement = loans.reduce(
      (sum, loan) => sum + Number(loan.loanAmount),
      0,
    );

    const expenseBreakdown = {
      loanDisbursement: totalLoanDisbursement,
    };

    const totalExpense = totalLoanDisbursement;

    const reportData: RevenueReportResponse = {
      period: `${startDate} to ${endDate}`,
      totalRevenue,
      breakdown,
      totalExpense,
      expenseBreakdown,
    };

    return {
      data: [reportData],
      summary: {
        totalRevenue,
        totalInterest: breakdown.interest,
        totalServiceFee: breakdown.serviceFee,
        totalLateFee: breakdown.lateFee,
        totalLiquidationExcess: breakdown.liquidationExcess,
        totalExpense,
        totalLoanDisbursement,
      },
    };
  }

  /**
   * Get daily log for police book (Sổ quản lý)
   */
  async getDailyLog(query: DailyLogQuery): Promise<DailyLogResponse> {
    const { date } = query;
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // New loans created today
    const newLoans = await this.prisma.loan.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
        collaterals: {
          include: {
            collateralType: true,
          },
        },
      },
    });

    // Loans closed today
    const closedLoans = await this.prisma.loan.findMany({
      where: {
        status: 'CLOSED',
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
        collaterals: {
          include: {
            collateralType: true,
          },
        },
      },
    });

    const mapLoanToEntry = (loan: any): DailyLogEntry => ({
      contractId: loan.id,
      customerName: loan.customer.fullName,
      nationalId: loan.customer.nationalId || 'N/A',
      address: loan.customer.address || 'N/A',
      phone: loan.customer.phone || 'N/A',
      collateralDescription: this.buildCollateralDescription(loan.collaterals),
      loanAmount: Number(loan.loanAmount),
      loanDate: loan.createdAt.toISOString().slice(0, 10),
      closedDate:
        loan.status === 'CLOSED'
          ? loan.updatedAt.toISOString().slice(0, 10)
          : undefined,
      status: loan.status,
    });

    return {
      date,
      newLoans: newLoans.map(mapLoanToEntry),
      closedLoans: closedLoans.map(mapLoanToEntry),
      summary: {
        totalNewLoans: newLoans.length,
        totalClosedLoans: closedLoans.length,
        totalNewLoanAmount: newLoans.reduce(
          (sum, loan) => sum + Number(loan.loanAmount),
          0,
        ),
      },
    };
  }

  /**
   * Generate quarterly report (Mẫu ĐK13)
   */
  async getQuarterlyReport(
    query: QuarterlyReportQuery,
  ): Promise<QuarterlyReportResponse> {
    const { year, quarter } = query;

    // Calculate quarter date range
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);

    // Loans issued in quarter
    const loansIssued = await this.prisma.loan.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const loanAmountSum = await this.prisma.loan.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { loanAmount: true },
    });

    // Loans closed in quarter
    const loansClosed = await this.prisma.loan.count({
      where: {
        status: 'CLOSED',
        updatedAt: { gte: startDate, lte: endDate },
      },
    });

    // Active loans at end of quarter
    const loansActive = await this.prisma.loan.count({
      where: {
        status: 'ACTIVE',
        createdAt: { lte: endDate },
      },
    });

    // Overdue loans at end of quarter
    const loansOverdue = await this.prisma.loan.count({
      where: {
        status: 'OVERDUE',
        createdAt: { lte: endDate },
      },
    });

    // Collaterals
    const collateralsReceived = await this.prisma.collateral.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const collateralsReleased = await this.prisma.collateral.count({
      where: {
        status: 'RELEASED',
        updatedAt: { gte: startDate, lte: endDate },
      },
    });

    const liquidations = await this.prisma.collateral.count({
      where: {
        status: 'SOLD',
        updatedAt: { gte: startDate, lte: endDate },
      },
    });

    // Revenue breakdown
    const revenues = await this.prisma.revenueLedger.findMany({
      where: {
        recordedAt: { gte: startDate, lte: endDate },
      },
    });

    const revenueBreakdown = {
      interest: 0,
      serviceFee: 0,
      lateFee: 0,
      liquidationProfit: 0,
    };

    let totalRevenue = 0;
    revenues.forEach((r) => {
      const amount = Number(r.amount);
      totalRevenue += amount;
      switch (r.type) {
        case 'INTEREST':
          revenueBreakdown.interest += amount;
          break;
        case 'SERVICE_FEE':
          revenueBreakdown.serviceFee += amount;
          break;
        case 'LATE_FEE':
          revenueBreakdown.lateFee += amount;
          break;
        case 'LIQUIDATION_EXCESS':
          revenueBreakdown.liquidationProfit += amount;
          break;
      }
    });

    // Compliance metrics
    const loans = await this.prisma.loan.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        collaterals: true,
      },
    });

    const averageLTV =
      loans.length > 0
        ? loans.reduce((sum, loan) => {
            const totalAppraisedValue = loan.collaterals.reduce(
              (colSum, col) => colSum + Number(col.appraisedValue),
              0,
            );
            return (
              sum +
              (totalAppraisedValue > 0
                ? Number(loan.loanAmount) / totalAppraisedValue
                : 0)
            );
          }, 0) / loans.length
        : 0;

    const averageInterestRate =
      loans.length > 0
        ? loans.reduce(
            (sum, loan) => sum + Number(loan.appliedInterestRate),
            0,
          ) / loans.length
        : 0;

    return {
      quarter,
      year,
      period: `Q${quarter} ${year}`,
      statistics: {
        totalLoansIssued: loansIssued,
        totalLoanAmount: Number(loanAmountSum._sum.loanAmount || 0),
        totalLoansClosed: loansClosed,
        totalLoansActive: loansActive,
        totalLoansOverdue: loansOverdue,
        totalCollateralsReceived: collateralsReceived,
        totalCollateralsReleased: collateralsReleased,
        totalLiquidations: liquidations,
        totalRevenue,
        revenueBreakdown,
      },
      compliance: {
        averageLTV: Math.round(averageLTV * 100) / 100,
        averageInterestRate: Math.round(averageInterestRate * 100) / 100,
        kycCompletionRate: 100, // TODO: Calculate based on actual KYC data
      },
    };
  }

  // ===== Helper Methods =====

  private buildCollateralDescription(collaterals: any[]): string {
    if (!collaterals || collaterals.length === 0) return 'N/A';

    return collaterals
      .map((col) => {
        const info = col.collateralInfo as any;
        const type = col.collateralType?.name || 'Unknown';

        if (info?.brand || info?.model) {
          return `${type}: ${info.brand || ''} ${info.model || ''}`.trim();
        }

        return type;
      })
      .join(', ');
  }
}
