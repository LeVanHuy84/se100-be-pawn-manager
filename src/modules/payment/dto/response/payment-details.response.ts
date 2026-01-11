import { PaymentComponent, PaymentMethod, PaymentType } from 'generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentAllocationItem {
  @ApiProperty({
    description: 'Repayment period number',
    example: 1,
  })
  periodNumber: number;

  @ApiProperty({
    description: 'Payment component type',
    enum: PaymentComponent,
    example: 'INTEREST',
  })
  component: PaymentComponent;

  @ApiProperty({
    description: 'Allocated amount for this component',
    example: 800000,
  })
  amount: number;

  @ApiProperty({
    description: 'Human-readable description',
    example: 'Interest for period 1',
    required: false,
  })
  description?: string;
}

export class LoanBalanceSummary {
  @ApiProperty({
    description: 'Remaining principal amount',
    example: 45000000,
  })
  remainingPrincipal: number;

  @ApiProperty({
    description: 'Remaining interest amount',
    example: 3200000,
  })
  remainingInterest: number;

  @ApiProperty({
    description: 'Remaining fee amount',
    example: 1040000,
  })
  remainingFees: number;

  @ApiProperty({
    description: 'Remaining penalty amount',
    example: 0,
  })
  remainingPenalty: number;

  @ApiProperty({
    description: 'Total remaining balance (sum of all components)',
    example: 49240000,
  })
  totalRemaining: number;
}

export class NextPaymentInfo {
  @ApiProperty({
    description: 'Due date of next payment (null if loan fully paid)',
    example: '2026-02-10',
    nullable: true,
  })
  dueDate: string | null;

  @ApiProperty({
    description: 'Amount due for next payment (null if loan fully paid)',
    example: 2800000,
    nullable: true,
  })
  amount: number | null;

  @ApiProperty({
    description: 'Period number of next payment (null if loan fully paid)',
    example: 2,
    nullable: true,
  })
  periodNumber: number | null;
}

export class PaymentResponse {
  @ApiProperty({
    description: 'Unique transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Loan ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  loanId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 2800000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: 'CASH',
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentType,
    example: 'PERIODIC',
  })
  paymentType: PaymentType;

  @ApiProperty({
    description: 'Payment timestamp (ISO 8601)',
    example: '2026-01-10T08:30:00.000Z',
  })
  paidAt: string;

  @ApiProperty({
    description: 'Breakdown of how payment was allocated across components',
    type: [PaymentAllocationItem],
  })
  allocation: PaymentAllocationItem[];

  @ApiProperty({
    description: 'Updated loan balance after payment',
    type: LoanBalanceSummary,
  })
  loanBalance: LoanBalanceSummary;

  @ApiProperty({
    description: 'Information about next payment due',
    type: NextPaymentInfo,
  })
  nextPayment: NextPaymentInfo;

  @ApiProperty({
    description: 'Status message',
    example: 'Payment processed successfully',
  })
  message: string;
}
