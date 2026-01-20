import { ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { baseFilterQuerySchema } from 'src/common/dto/filter.type';
import { z } from 'zod';

export const overdueLoansQuerySchema = baseFilterQuerySchema
  .extend({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
      .optional(),
    storeId: z.uuid().optional(),
  })
  .refine(
    (data) => {
      // If both dates provided, validate max 30 days range
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= 30 && diffDays >= 0;
      }
      return true;
    },
    {
      message:
        'Date range must not exceed 30 days and endDate must be after startDate',
      path: ['endDate'],
    },
  );

export class OverdueLoansQuery extends createZodDto(overdueLoansQuerySchema) {
  @ApiPropertyOptional({
    description: 'Filter by overdue start date (inclusive). Format: YYYY-MM-DD',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Filter by overdue end date (inclusive). Max 30 days from startDate. Format: YYYY-MM-DD',
    example: '2024-01-31',
    type: String,
    format: 'date',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by store ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  storeId?: string;
}
