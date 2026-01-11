import z from 'zod';

import { createZodDto } from 'nestjs-zod';
import { PaymentMethod, PaymentType } from 'generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

export const paymentRequestSchema = z.object({
  loanId: z.uuid('loanId is required'),
  amount: z.number().positive('Amount must be > 0'),
  paymentMethod: z.enum(PaymentMethod),
  paymentType: z.enum(PaymentType),
  referenceCode: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export class PaymentRequestDto extends createZodDto(paymentRequestSchema) {
  @ApiProperty({
    description: 'Loan ID to apply payment to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  loanId: string;

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
      'Payment type: PERIODIC (regular installment), EARLY (advance payment), PAYOFF (full settlement), ADJUSTMENT (correction)',
    enum: PaymentType,
    example: 'PERIODIC',
  })
  paymentType: PaymentType;

  @ApiProperty({
    description:
      'Reference code for tracking (e.g., bank transfer reference, receipt number)',
    example: 'PAY-2026-001',
    required: false,
    maxLength: 100,
  })
  referenceCode?: string;

  @ApiProperty({
    description: 'Additional notes or comments',
    example: 'Thanh toán kỳ 1',
    required: false,
    maxLength: 500,
  })
  notes?: string;
}
