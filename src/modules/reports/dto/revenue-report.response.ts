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
}

class ExpenseBreakdown {
  @ApiProperty({ description: 'Loan disbursement expenses', example: 50000000 })
  loanDisbursement: number;
}

export class RevenueReportResponse {
  @ApiProperty({ description: 'Period identifier', example: '2024-01' })
  period: string;

  @ApiProperty({
    description: 'Total revenue for the period',
    example: 6700000,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Revenue breakdown by type',
    type: RevenueBreakdown,
  })
  breakdown: RevenueBreakdown;

  @ApiProperty({
    description: 'Total expenses for the period',
    example: 50000000,
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
    description: 'Revenue data by period',
    type: [RevenueReportResponse],
  })
  data: RevenueReportResponse[];

  @ApiProperty({ description: 'Summary of all revenue', type: RevenueSummary })
  summary: RevenueSummary;
}
