import z from 'zod';

import { createZodDto } from 'nestjs-zod';
import { PaymentMethod } from '@prisma/client';

export const paymentRequestSchema = z.object({
  loanId: z.uuid('loanId is required'),
  amount: z.number().positive('Amount must be > 0'),
  paymentMethod: z.enum(PaymentMethod),
  referenceCode: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export class PaymentRequestDto extends createZodDto(paymentRequestSchema) {}
