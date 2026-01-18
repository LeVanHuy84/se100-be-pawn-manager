import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const quarterlyReportQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .describe('Year (2000-2100)'),
  quarter: z.coerce.number().int().min(1).max(4).describe('Quarter (1-4)'),
  storeId: z.uuid().optional().describe('Store ID (optional)'),
});

export class QuarterlyReportQuery extends createZodDto(
  quarterlyReportQuerySchema,
) {
  @ApiProperty({ description: 'Year', example: 2024 })
  year: number;

  @ApiProperty({ description: 'Quarter (1-4)', example: 1 })
  quarter: number;

  @ApiProperty({
    description: 'Store ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  storeId?: string;
}

class AssetBreakdownItem {
  @ApiProperty({ description: 'Asset category name', example: 'Laptop' })
  category: string;

  @ApiProperty({ description: 'Number of assets received', example: 10 })
  receivedCount: number;
  @ApiProperty({ description: 'Value of assets received', example: 50000000 })
  receivedValue: number;

  @ApiProperty({ description: 'Number of assets released', example: 5 })
  releasedCount: number;
  @ApiProperty({ description: 'Value of assets released', example: 25000000 })
  releasedValue: number;

  @ApiProperty({ description: 'Number of assets liquidated', example: 2 })
  liquidatedCount: number;
  @ApiProperty({ description: 'Value of assets liquidated', example: 10000000 })
  liquidatedValue: number;

  @ApiProperty({ description: 'Number of assets in stock', example: 20 })
  inStockCount: number;
  @ApiProperty({ description: 'Value of assets in stock', example: 100000000 })
  inStockValue: number;
}

class EmployeeReport {
  @ApiProperty({ description: 'Total employees', example: 5 })
  total: number;
  @ApiProperty({ description: 'Male employees', example: 3 })
  male: number;
  @ApiProperty({ description: 'Female employees', example: 2 })
  female: number;
}

class SecurityPersonnelReport {
  @ApiProperty({ description: 'Total security personnel', example: 2 })
  count: number;
}

class QuarterlyStatistics {
  @ApiProperty({ description: 'Total loans issued in quarter', example: 150 })
  totalLoansIssued: number;

  @ApiProperty({ description: 'Total loan amount issued', example: 500000000 })
  totalLoanAmount: number;

  @ApiProperty({ description: 'Total loans closed in quarter', example: 120 })
  totalLoansClosed: number;

  @ApiProperty({
    description: 'Total active loans at end of quarter',
    example: 200,
  })
  totalLoansActive: number;

  @ApiProperty({
    description: 'Total overdue loans at end of quarter',
    example: 15,
  })
  totalLoansOverdue: number;

  @ApiProperty({ description: 'Total collaterals received', example: 180 })
  totalCollateralsReceived: number;

  @ApiProperty({ description: 'Total collaterals released', example: 110 })
  totalCollateralsReleased: number;

  @ApiProperty({ description: 'Total liquidations', example: 5 })
  totalLiquidations: number;

  @ApiProperty({ description: 'Total revenue', example: 50000000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Revenue breakdown by type' })
  revenueBreakdown: {
    interest: number;
    serviceFee: number;
    lateFee: number;
  };

  @ApiProperty({
    type: [AssetBreakdownItem],
    description: 'Activity by asset type',
  })
  assetBreakdown: AssetBreakdownItem[];

  @ApiProperty({ type: EmployeeReport, description: 'Employee statistics' })
  employees: EmployeeReport;

  @ApiProperty({
    type: SecurityPersonnelReport,
    description: 'Security personnel statistics',
  })
  security: SecurityPersonnelReport;
}

class QuarterlyCompliance {
  @ApiProperty({ description: 'Average Loan-to-Value ratio', example: 0.7 })
  averageLTV: number;

  @ApiProperty({ description: 'Average interest rate', example: 2.5 })
  averageInterestRate: number;

  @ApiProperty({ description: 'KYC completion rate (%)', example: 100 })
  kycCompletionRate: number;
}

export class QuarterlyReportResponse {
  @ApiProperty({ description: 'Quarter number', example: 1 })
  quarter: number;

  @ApiProperty({ description: 'Year', example: 2024 })
  year: number;

  @ApiProperty({ description: 'Period label', example: 'Q1 2024' })
  period: string;

  @ApiProperty({
    description: 'Quarterly statistics',
    type: QuarterlyStatistics,
  })
  statistics: QuarterlyStatistics;

  @ApiProperty({ description: 'Compliance metrics', type: QuarterlyCompliance })
  compliance: QuarterlyCompliance;
}
