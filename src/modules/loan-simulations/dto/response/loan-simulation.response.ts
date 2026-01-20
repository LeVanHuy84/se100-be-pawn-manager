import { ApiProperty } from '@nestjs/swagger';

export class LoanSimulationScheduleItem {
  @ApiProperty({
    description: 'Period number (1-based index)',
    example: 1,
  })
  periodNumber: number;

  @ApiProperty({
    description: 'Due date in ISO format (YYYY-MM-DD)',
    example: '2026-02-10',
  })
  dueDate: string;

  @ApiProperty({
    description: 'Outstanding principal balance at beginning of period (VND)',
    example: 50000000,
  })
  beginningBalance: number;

  @ApiProperty({
    description: 'Principal amount due this period (VND)',
    example: 4166667,
  })
  principalAmount: number;

  @ApiProperty({
    description: 'Interest amount for this period (VND)',
    example: 800000,
  })
  interestAmount: number;

  @ApiProperty({
    description: 'Fees for this period (management + custody) (VND)',
    example: 250000,
  })
  feeAmount: number;

  @ApiProperty({
    description: 'Total payment due this period (VND)',
    example: 5216667,
  })
  totalAmount: number;
}

export class LoanSimulationResponse {
  @ApiProperty({
    description: 'Loan amount (VND)',
    example: 50000000,
  })
  loanAmount: number;

  @ApiProperty({
    description: 'Loan duration in months',
    example: 12,
  })
  durationMonths: number;

  @ApiProperty({
    description: 'Loan product type name',
    example: '12-Month Standard Loan',
  })
  productType: string;

  @ApiProperty({
    description: 'Applied monthly interest rate (%)',
    example: 1.6,
  })
  appliedInterestRate: number;

  @ApiProperty({
    description: 'Applied monthly management fee rate (%)',
    example: 0.02,
  })
  appliedMgmtFeeRateMonthly: number;

  @ApiProperty({
    description: 'Total custody fee rate per month (%)',
    example: 0.5,
  })
  totalCustodyFeeRate: number;

  @ApiProperty({
    description: 'Total interest over loan lifetime (VND)',
    example: 5200000,
  })
  totalInterest: number;

  @ApiProperty({
    description: 'Total fees over loan lifetime (VND)',
    example: 3000000,
  })
  totalFees: number;

  @ApiProperty({
    description: 'Total amount to repay (principal + interest + fees) (VND)',
    example: 58200000,
  })
  totalRepayment: number;

  @ApiProperty({
    description: 'Average monthly payment (VND)',
    example: 4850000,
  })
  monthlyPayment: number;

  @ApiProperty({
    description: 'Detailed repayment schedule by period',
    type: [LoanSimulationScheduleItem],
  })
  schedule: LoanSimulationScheduleItem[];
}
