import { ApiProperty } from '@nestjs/swagger';

export class DailyLogEntry {
  @ApiProperty({ description: 'Loan/Contract ID', example: 'abc123-456' })
  contractId: string;

  @ApiProperty({ description: 'Customer full name', example: 'Nguyễn Văn A' })
  customerName: string;

  @ApiProperty({ description: 'National ID (CCCD)', example: '001234567890' })
  nationalId: string;

  @ApiProperty({
    description: 'Customer address',
    example: '123 Nguyễn Huệ, Q1, TP.HCM',
  })
  address: string;

  @ApiProperty({ description: 'Customer phone number', example: '0901234567' })
  phone: string;

  @ApiProperty({
    description: 'Collateral description',
    example: 'Xe máy Honda Vision, BKS 59X-123.45',
  })
  collateralDescription: string;

  @ApiProperty({ description: 'Loan amount in VND', example: 10000000 })
  loanAmount: number;

  @ApiProperty({ description: 'Loan creation date', example: '2024-01-15' })
  loanDate: string;

  @ApiProperty({
    description: 'Loan closed date (if closed)',
    example: '2024-03-15',
    required: false,
  })
  closedDate?: string;

  @ApiProperty({ description: 'Loan status', example: 'ACTIVE' })
  status: string;
}

class DailyLogSummary {
  @ApiProperty({ description: 'Total new loans created', example: 5 })
  totalNewLoans: number;

  @ApiProperty({ description: 'Total loans closed', example: 3 })
  totalClosedLoans: number;

  @ApiProperty({
    description: 'Total new loan amount in VND',
    example: 50000000,
  })
  totalNewLoanAmount: number;
}

export class DailyLogResponse {
  @ApiProperty({ description: 'Report date', example: '2024-01-15' })
  date: string;

  @ApiProperty({
    description: 'List of new loans created on this date',
    type: [DailyLogEntry],
  })
  newLoans: DailyLogEntry[];

  @ApiProperty({
    description: 'List of loans closed on this date',
    type: [DailyLogEntry],
  })
  closedLoans: DailyLogEntry[];

  @ApiProperty({
    description: 'Daily summary statistics',
    type: DailyLogSummary,
  })
  summary: DailyLogSummary;
}
