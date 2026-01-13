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

    // Build where clause
    const revenueWhere: any = {
      recordedAt: {
        gte: start,
        lte: end,
      },
    };

    const disbursementWhere: any = {
      disbursedAt: {
        gte: start,
        lte: end,
      },
    };

    if (storeId) {
      revenueWhere.loan = { storeId };
      disbursementWhere.loan = { storeId };
    }

    // Parallel queries for better performance - fetch with date info
    const [revenues, disbursements] = await Promise.all([
      this.prisma.revenueLedger.findMany({
        where: revenueWhere,
        select: {
          amount: true,
          type: true,
          recordedAt: true,
        },
      }),
      this.prisma.disbursement.findMany({
        where: disbursementWhere,
        select: {
          amount: true,
          disbursedAt: true,
        },
      }),
    ]);

    // Generate daily data for chart
    const dailyData: RevenueReportResponse[] = [];
    const currentDate = new Date(start);

    // Summary totals
    let summaryRevenue = 0;
    const summaryBreakdown = {
      interest: 0,
      serviceFee: 0,
      lateFee: 0,
      liquidationExcess: 0,
    };
    let summaryExpense = 0;

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get current day's date string for comparison
      const currentYear = dayStart.getFullYear();
      const currentMonth = dayStart.getMonth();
      const currentDay = dayStart.getDate();

      // Filter revenues for this day - compare date components
      const dayRevenues = revenues.filter((r) => {
        const recordDate = new Date(r.recordedAt);
        return (
          recordDate.getFullYear() === currentYear &&
          recordDate.getMonth() === currentMonth &&
          recordDate.getDate() === currentDay
        );
      });

      // Filter disbursements for this day - compare date components
      const dayDisbursements = disbursements.filter((d) => {
        const disbursedDate = new Date(d.disbursedAt);
        return (
          disbursedDate.getFullYear() === currentYear &&
          disbursedDate.getMonth() === currentMonth &&
          disbursedDate.getDate() === currentDay
        );
      });

      // Calculate daily breakdown
      const dayBreakdown = {
        interest: 0,
        serviceFee: 0,
        lateFee: 0,
        liquidationExcess: 0,
      };

      let dayTotalRevenue = 0;

      dayRevenues.forEach((revenue) => {
        const amount = Number(revenue.amount);
        dayTotalRevenue += amount;

        switch (revenue.type) {
          case 'INTEREST':
            dayBreakdown.interest += amount;
            break;
          case 'SERVICE_FEE':
            dayBreakdown.serviceFee += amount;
            break;
          case 'LATE_FEE':
            dayBreakdown.lateFee += amount;
            break;
          case 'LIQUIDATION_EXCESS':
            dayBreakdown.liquidationExcess += amount;
            break;
        }
      });

      // Calculate daily expense
      const dayExpense = dayDisbursements.reduce(
        (sum, d) => sum + Number(d.amount),
        0,
      );

      // Add to daily data
      // Format date as YYYY-MM-DD using local timezone to avoid date shift
      const year = dayStart.getFullYear();
      const month = String(dayStart.getMonth() + 1).padStart(2, '0');
      const day = String(dayStart.getDate()).padStart(2, '0');
      const dateString = `${day}-${month}-${year}`;

      dailyData.push({
        date: dateString,
        totalRevenue: Math.round(dayTotalRevenue),
        breakdown: {
          interest: Math.round(dayBreakdown.interest),
          serviceFee: Math.round(dayBreakdown.serviceFee),
          lateFee: Math.round(dayBreakdown.lateFee),
          liquidationExcess: Math.round(dayBreakdown.liquidationExcess),
        },
        totalExpense: Math.round(dayExpense),
        expenseBreakdown: {
          loanDisbursement: Math.round(dayExpense),
        },
      });

      // Accumulate summary
      summaryRevenue += dayTotalRevenue;
      summaryBreakdown.interest += dayBreakdown.interest;
      summaryBreakdown.serviceFee += dayBreakdown.serviceFee;
      summaryBreakdown.lateFee += dayBreakdown.lateFee;
      summaryBreakdown.liquidationExcess += dayBreakdown.liquidationExcess;
      summaryExpense += dayExpense;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      data: dailyData,
      summary: {
        totalRevenue: Math.round(summaryRevenue),
        totalInterest: Math.round(summaryBreakdown.interest),
        totalServiceFee: Math.round(summaryBreakdown.serviceFee),
        totalLateFee: Math.round(summaryBreakdown.lateFee),
        totalLiquidationExcess: Math.round(summaryBreakdown.liquidationExcess),
        totalExpense: Math.round(summaryExpense),
        totalLoanDisbursement: Math.round(summaryExpense),
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

    // Parallel queries for new and closed loans
    const [newLoans, closedLoans] = await Promise.all([
      this.prisma.loan.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          loanCode: true,
          loanAmount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              fullName: true,
              nationalId: true,
              address: true,
              phone: true,
            },
          },
          collaterals: {
            select: {
              collateralInfo: true,
              collateralType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.loan.findMany({
        where: {
          status: 'CLOSED',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          loanCode: true,
          loanAmount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              fullName: true,
              nationalId: true,
              address: true,
              phone: true,
            },
          },
          collaterals: {
            select: {
              collateralInfo: true,
              collateralType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

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

    // Parallel queries for better performance
    const [
      loansInQuarter,
      loansClosed,
      loansActive,
      loansOverdue,
      collateralsReceived,
      collateralsReleased,
      liquidations,
      revenues,
    ] = await Promise.all([
      // Loans issued in quarter
      this.prisma.loan.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          loanAmount: true,
          appliedInterestRate: true,
          collaterals: {
            select: {
              appraisedValue: true,
            },
          },
        },
      }),
      // Loans closed in quarter
      this.prisma.loan.count({
        where: {
          status: 'CLOSED',
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      // Active loans at end of quarter
      this.prisma.loan.count({
        where: {
          status: 'ACTIVE',
          createdAt: { lte: endDate },
        },
      }),
      // Overdue loans at end of quarter
      this.prisma.loan.count({
        where: {
          status: 'OVERDUE',
          createdAt: { lte: endDate },
        },
      }),
      // Collaterals
      this.prisma.collateral.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.collateral.count({
        where: {
          status: 'RELEASED',
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.collateral.count({
        where: {
          status: 'SOLD',
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      // Revenue breakdown
      this.prisma.revenueLedger.findMany({
        where: {
          recordedAt: { gte: startDate, lte: endDate },
        },
        select: {
          amount: true,
          type: true,
        },
      }),
    ]);

    // Calculate statistics
    const loansIssued = loansInQuarter.length;
    const totalLoanAmount = loansInQuarter.reduce(
      (sum, loan) => sum + Number(loan.loanAmount),
      0,
    );

    // Revenue breakdown
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
    const averageLTV =
      loansIssued > 0
        ? loansInQuarter.reduce((sum, loan) => {
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
          }, 0) / loansIssued
        : 0;

    const averageInterestRate =
      loansIssued > 0
        ? loansInQuarter.reduce(
            (sum, loan) => sum + Number(loan.appliedInterestRate),
            0,
          ) / loansIssued
        : 0;

    return {
      quarter,
      year,
      period: `Q${quarter} ${year}`,
      statistics: {
        totalLoansIssued: loansIssued,
        totalLoanAmount: Math.round(totalLoanAmount),
        totalLoansClosed: loansClosed,
        totalLoansActive: loansActive,
        totalLoansOverdue: loansOverdue,
        totalCollateralsReceived: collateralsReceived,
        totalCollateralsReleased: collateralsReleased,
        totalLiquidations: liquidations,
        totalRevenue: Math.round(totalRevenue),
        revenueBreakdown: {
          interest: Math.round(revenueBreakdown.interest),
          serviceFee: Math.round(revenueBreakdown.serviceFee),
          lateFee: Math.round(revenueBreakdown.lateFee),
          liquidationProfit: Math.round(revenueBreakdown.liquidationProfit),
        },
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
