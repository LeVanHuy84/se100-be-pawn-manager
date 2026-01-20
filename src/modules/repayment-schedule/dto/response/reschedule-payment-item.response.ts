import { ApiProperty } from '@nestjs/swagger';
import { RepaymentItemStatus } from 'generated/prisma';

export class RepaymentScheduleItemResponse {
  @ApiProperty({
    description: 'Unique identifier of the repayment schedule item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'UUID of the associated loan',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  loanId: string;

  @ApiProperty({
    description: 'Period number (1, 2, 3, ...)',
    example: 1,
  })
  periodNumber: number;

  @ApiProperty({
    description: 'Due date for this payment period',
    example: '2026-02-15',
    format: 'date',
  })
  dueDate: string; // 'YYYY-MM-DD'

  @ApiProperty({
    description: 'Loan balance at the beginning of this period (VND)',
    example: 10000000,
  })
  beginningBalance: number;

  @ApiProperty({
    description: 'Principal amount due for this period (VND)',
    example: 500000,
  })
  principalAmount: number;

  @ApiProperty({
    description: 'Interest amount due for this period (VND)',
    example: 200000,
  })
  interestAmount: number;

  @ApiProperty({
    description: 'Service fee amount for this period (VND)',
    example: 50000,
  })
  feeAmount: number;

  @ApiProperty({
    description: 'Total amount due for this period (VND)',
    example: 750000,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Payment status of this period',
    enum: ['PENDING', 'OVERDUE', 'PAID'],
    example: 'PENDING',
  })
  status: RepaymentItemStatus;

  @ApiProperty({
    description: 'Amount of principal already paid (VND)',
    example: 0,
  })
  paidPrincipal: number;

  @ApiProperty({
    description: 'Amount of interest already paid (VND)',
    example: 0,
  })
  paidInterest: number;

  @ApiProperty({
    description: 'Amount of fee already paid (VND)',
    example: 0,
  })
  paidFee: number;

  @ApiProperty({
    description: 'Timestamp when this period was fully paid (null if not paid)',
    example: '2026-02-14T10:30:00.000Z',
    nullable: true,
  })
  paidAt: string | null;
}
