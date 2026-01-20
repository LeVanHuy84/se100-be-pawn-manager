import z from 'zod';

import { createZodDto } from 'nestjs-zod';
import { PaymentMethod, PaymentType } from 'generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

export const paymentRequestSchema = z.object({
  loanId: z.string().optional(),
  storeId: z.string().optional(),
  amount: z.number().positive('Amount must be > 0'),
  paymentMethod: z.enum(PaymentMethod),
  paymentType: z.enum(PaymentType),
  notes: z.string().max(500).optional(),
});

export class PaymentRequestDto extends createZodDto(paymentRequestSchema) {
  @ApiProperty({
    description: 'Loan ID to apply payment to (Optional for OTHER type)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    required: false,
  })
  loanId?: string;

  @ApiProperty({
    description: 'Store ID (Required for OTHER type)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    required: false,
  })
  storeId?: string;

  @ApiProperty({
    description: 'Payment amount in VND',
    example: 2800000,
    minimum: 1,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: 'CASH',
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description:
      'Payment type: PERIODIC (regular installment), EARLY (advance payment), PAYOFF (full settlement), ADJUSTMENT (correction), OTHER (income)',
    enum: PaymentType,
    example: 'PERIODIC',
  })
  paymentType: PaymentType;

  @ApiProperty({
    description: 'Additional notes or comments',
    example: 'Thanh toán kỳ 1',
    required: false,
    maxLength: 500,
  })
  notes?: string;
}
