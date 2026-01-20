import { ApiProperty } from '@nestjs/swagger';
import { RepaymentScheduleItemResponse } from './reschedule-payment-item.response';
import { LoanStatus } from 'generated/prisma';

export class CustomerInfoResponse {
  @ApiProperty({ description: 'Customer full name', example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ description: 'Customer phone', example: '0901234567' })
  phone: string;

  @ApiProperty({ description: 'National ID', example: '001234567890' })
  nationalId: string;
}

export class OverdueLoanResponse {
  @ApiProperty({
    description: 'Loan ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  loanId: string;

  @ApiProperty({ description: 'Loan code', example: 'LOAN-2024-000001' })
  loanCode: string;

  @ApiProperty({
    description: 'Loan status',
    enum: [...Object.values(LoanStatus)],
    example: 'OVERDUE',
  })
  loanStatus: LoanStatus;

  @ApiProperty({
    description: 'Customer information',
    type: CustomerInfoResponse,
  })
  customer: CustomerInfoResponse;

  @ApiProperty({
    description: 'Total overdue amount (sum of all overdue periods)',
    example: 5000000,
  })
  totalOverdueAmount: number;

  @ApiProperty({
    description: 'Number of overdue periods',
    example: 2,
  })
  overduePeriodsCount: number;

  @ApiProperty({
    description: 'Earliest overdue date',
    example: '2024-01-15',
    type: String,
  })
  earliestOverdueDate: string;

  @ApiProperty({
    description: 'Days overdue from earliest period',
    example: 10,
  })
  daysOverdue: number;

  @ApiProperty({
    description: 'List of overdue repayment schedule items',
    type: [RepaymentScheduleItemResponse],
  })
  overdueItems: RepaymentScheduleItemResponse[];
}
