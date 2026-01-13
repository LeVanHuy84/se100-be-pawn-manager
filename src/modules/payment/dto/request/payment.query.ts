import { BaseFilterQuery } from 'src/common/dto/filter.type';

import { PaymentMethod, PaymentType } from 'generated/prisma';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPaymentsQuery extends BaseFilterQuery {
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
  dateFrom?: string; // 'YYYY-MM-DD'

  @ApiPropertyOptional({
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  dateTo?: string; // 'YYYY-MM-DD'

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
