import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentType } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';
import { baseFilterQuerySchema } from 'src/common/dto/filter.type';
import { z } from 'zod';

export const listPaymentsQuerySchema = baseFilterQuerySchema.extend({
  loanId: z.uuid().optional(),
  storeId: z.uuid().optional(),
  paymentMethod: z.enum(PaymentMethod).optional(),
  paymentType: z.enum(PaymentType).optional(),
  dateFrom: z.iso
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  dateTo: z.iso
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
});

export class ListPaymentsQuery extends createZodDto(listPaymentsQuerySchema) {
  @ApiPropertyOptional({
    description: 'Filter by loan ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  loanId?: string;

  @ApiPropertyOptional({
    description: 'Filter by store ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  storeId?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Filter by payment method',
    example: 'CASH',
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    enum: PaymentType,
    description: 'Filter by payment type',
    example: 'PERIODIC',
  })
  paymentType?: PaymentType;

  @ApiPropertyOptional({
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Minimum payment amount',
    example: 1000000,
    type: Number,
  })
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum payment amount',
    example: 10000000,
    type: Number,
  })
  maxAmount?: number;
}
