import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisbursementMethod } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';
import { baseFilterQuerySchema } from 'src/common/dto/filter.type';
import { z } from 'zod';

export const listDisbursementsQuerySchema = baseFilterQuerySchema.extend({
  loanId: z.uuid().optional(),
  storeId: z.uuid().optional(),
  disbursementMethod: z.enum(DisbursementMethod).optional(),
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
  recipientName: z.string().optional(),
});

export class ListDisbursementsQuery extends createZodDto(
  listDisbursementsQuerySchema,
) {
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
    enum: DisbursementMethod,
    description: 'Filter by disbursement method',
    example: 'CASH',
  })
  disbursementMethod?: DisbursementMethod;

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
    description: 'Minimum disbursement amount',
    example: 1000000,
    type: Number,
  })
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum disbursement amount',
    example: 50000000,
    type: Number,
  })
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Filter by recipient name',
    example: 'Nguyễn Văn A',
  })
  recipientName?: string;
}
