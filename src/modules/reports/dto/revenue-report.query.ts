import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const revenueReportQuerySchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Start date in YYYY-MM-DD format'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('End date in YYYY-MM-DD format'),
    storeId: z
      .uuid()
      .optional()
      .describe('Filter by store UUID (for multi-location)'),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    },
    {
      message: 'Date range cannot exceed 30 days',
    },
  );

export class RevenueReportQuery extends createZodDto(revenueReportQuerySchema) {
  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2024-01-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2024-01-31',
  })
  endDate: string;

  @ApiPropertyOptional({
    description: 'Filter by store UUID (for multi-location)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  storeId?: string;
}
