import { PaymentMethod, PaymentType } from 'generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentListItem {
  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Loan ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  loanId: string | null;

  @ApiProperty({
    description: 'Payment amount in VND',
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
    description: 'Reference code',
    example: 'PAY-2026-001',
    required: false,
    nullable: true,
  })
  referenceCode?: string | null;

  @ApiProperty({
    description: 'Customer name',
    example: 'Nguyễn Văn A',
    required: false,
  })
  customerName?: string;

  @ApiProperty({
    description: 'Customer phone',
    example: '0912345678',
    required: false,
  })
  customerPhone?: string;

  @ApiProperty({
    description: 'Notes about the payment',
    example: 'Payment for liquidation of collateral',
    required: false,
    nullable: true,
  })
  notes?: string | null;
}
