import { ApiProperty } from '@nestjs/swagger';

class RevenueBreakdown {
  @ApiProperty({ description: 'Interest revenue', example: 5000000 })
  interest: number;

  @ApiProperty({ description: 'Service fee revenue', example: 1000000 })
  serviceFee: number;

  @ApiProperty({ description: 'Late fee revenue', example: 500000 })
  lateFee: number;

  @ApiProperty({ description: 'Liquidation excess revenue', example: 200000 })
  liquidationExcess: number;

  @ApiProperty({
    description: 'Total amount received from liquidation sale',
    example: 15000000,
  })
  liquidationSale: number;

  @ApiProperty({
    description: 'Amount refunded to customer from excess (negative value)',
    example: -500000,
  })
  excessRefund: number;
}

class ExpenseBreakdown {
  @ApiProperty({ description: 'Loan disbursement expenses', example: 50000000 })
  loanDisbursement: number;
}

export class RevenueReportResponse {
  @ApiProperty({
    description:
      'Date for this data point (YYYY-MM-DD format for daily reports)',
    example: '2026-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Total revenue for the period',
    example: 250000.5,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Revenue breakdown by type',
    type: RevenueBreakdown,
  })
  breakdown: RevenueBreakdown;

  @ApiProperty({
    description: 'Total expenses for the period',
    example: 10000000.0,
  })
  totalExpense: number;

  @ApiProperty({
    description: 'Expense breakdown by type',
    type: ExpenseBreakdown,
  })
  expenseBreakdown: ExpenseBreakdown;
}

class RevenueSummary {
  @ApiProperty({
    description: 'Total revenue across all periods',
    example: 50000000,
  })
  totalRevenue: number;

  @ApiProperty({ description: 'Total interest revenue', example: 30000000 })
  totalInterest: number;

  @ApiProperty({ description: 'Total service fee revenue', example: 10000000 })
  totalServiceFee: number;

  @ApiProperty({ description: 'Total late fee revenue', example: 8000000 })
  totalLateFee: number;

  @ApiProperty({
    description: 'Total liquidation excess revenue',
    example: 2000000,
  })
  totalLiquidationExcess: number;

  @ApiProperty({
    description: 'Total liquidation sale amount',
    example: 30000000,
  })
  totalLiquidationSale: number;

  @ApiProperty({
    description: 'Total excess refunded to customers (negative value)',
    example: -5000000,
  })
  totalExcessRefund: number;

  @ApiProperty({
    description: 'Total expenses across all periods',
    example: 150000000,
  })
  totalExpense: number;

  @ApiProperty({
    description: 'Total loan disbursement expenses',
    example: 150000000,
  })
  totalLoanDisbursement: number;
}

export class RevenueReportListResponse {
  @ApiProperty({
    description:
      'Daily revenue data - one entry per day in the queried date range. Use this array to plot charts.',
    type: [RevenueReportResponse],
    example: [
      {
        date: '2026-01-01',
        totalRevenue: 150000.0,
        breakdown: {
          interest: 100000.0,
          serviceFee: 30000.0,
          lateFee: 20000.0,
          liquidationExcess: 0.0,
        },
        totalExpense: 10000000.0,
        expenseBreakdown: { loanDisbursement: 10000000.0 },
      },
      {
        date: '2026-01-02',
        totalRevenue: 200000.0,
        breakdown: {
          interest: 150000.0,
          serviceFee: 40000.0,
          lateFee: 10000.0,
          liquidationExcess: 0.0,
        },
        totalExpense: 5000000.0,
        expenseBreakdown: { loanDisbursement: 5000000.0 },
      },
    ],
  })
  detail: RevenueReportResponse[];

  @ApiProperty({
    description:
      'Summary totals across all days in the date range. Use this for displaying overall statistics.',
    type: RevenueSummary,
  })
  summary: RevenueSummary;
}
