import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus, RepaymentMethod } from 'generated/prisma';
import { CollateralAssetResponse } from 'src/modules/collateral/dto/response/collateral.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';

// Keep original interface for backward compatibility
// export interface LoanResponse {
//   id: string;
//   customerId: string;

//   loanAmount: number;
//   repaymentMethod: RepaymentMethod;

//   loanTypeId: number;
//   loanTypeName: string;

//   durationMonths: number;
//   appliedInterestRate: number;
//   latePaymentPenaltyRate: number;

//   totalInterest: number;
//   totalFees: number;
//   totalRepayment: number;
//   monthlyPayment: number;

//   status: LoanStatus;

//   startDate: string | null;
//   activatedAt?: string | null;
//   notes?: string | null;

//   createdAt: string;
//   updatedAt: string;

//   collateral?: CollateralAssetResponse[];
// }

// Swagger-compatible Loan response DTO
export class LoanResponseDto {
  @ApiProperty({ description: 'Loan ID', example: 'clx1234567890' })
  id: string;

  @ApiProperty({ description: 'Customer ID', example: 'cus_123' })
  customerId: string;

  @ApiProperty({ description: 'Loan amount', example: 10000000 })
  loanAmount: number;

  @ApiProperty({
    description: 'Repayment method',
    enum: RepaymentMethod,
    example: 'MONTHLY',
  })
  repaymentMethod: RepaymentMethod;

  @ApiProperty({ description: 'Loan type ID', example: 1 })
  loanTypeId: number;

  @ApiProperty({ description: 'Loan type name', example: 'Personal Loan' })
  loanTypeName: string;

  @ApiProperty({ description: 'Duration in months', example: 12 })
  durationMonths: number;

  @ApiProperty({ description: 'Applied interest rate', example: 1.5 })
  appliedInterestRate: number;

  @ApiProperty({ description: 'Late payment penalty rate', example: 0.5 })
  latePaymentPenaltyRate: number;

  @ApiProperty({ description: 'Total interest', example: 1800000 })
  totalInterest: number;

  @ApiProperty({ description: 'Total fees', example: 200000 })
  totalFees: number;

  @ApiProperty({ description: 'Total repayment amount', example: 12000000 })
  totalRepayment: number;

  @ApiProperty({ description: 'Monthly payment amount', example: 1000000 })
  monthlyPayment: number;

  @ApiProperty({
    description: 'Loan status',
    enum: LoanStatus,
    example: 'PENDING',
  })
  status: LoanStatus;

  @ApiProperty({
    description: 'Loan start date',
    example: '2024-01-15',
    nullable: true,
  })
  startDate: string | null;

  @ApiPropertyOptional({
    description: 'Activation date',
    example: '2024-01-15',
    nullable: true,
  })
  activatedAt?: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Approved by manager',
    nullable: true,
  })
  notes?: string | null;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-10' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Associated collateral assets',
    type: [CollateralAssetResponse],
  })
  collateral?: CollateralAssetResponse[];
}

// Response for Create Loan API
export class CreateLoanResponseDto {
  @ApiProperty({
    description: 'Response loan from database',
  })
  loan: LoanResponseDto;

  @ApiProperty({
    description: 'Success message',
    example:
      'Loan application created successfully. Status: PENDING. Awaiting approval.',
  })
  message: string;
}

// Response for Update Loan API
export class UpdateLoanResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Loan updated successfully (PENDING stage)',
  })
  message: string;

  @ApiProperty({
    description: 'Response loan from database',
  })
  loan: LoanResponseDto;
}

// Response for Update Status API
export class UpdateLoanStatusResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Loan approved',
  })
  message: string;

  @ApiProperty({
    description: 'Response loan from database',
  })
  loan: LoanResponseDto;
}

// Response for List Loans API
export class ListLoansResponseDto {
  @ApiProperty({
    description: 'Array of loan records',
    type: [LoanResponseDto],
  })
  data: LoanResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
