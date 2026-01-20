import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const dailyLogQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Target date in YYYY-MM-DD format'),
  storeId: z
    .uuid()
    .optional()
    .describe('Filter by store UUID (for multi-location)'),
});

export class DailyLogQuery extends createZodDto(dailyLogQuerySchema) {
  @ApiProperty({
    description: 'Target date in YYYY-MM-DD format',
    example: '2024-01-15',
  })
  date: string;

  @ApiPropertyOptional({
    description: 'Filter by store UUID (for multi-location)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  storeId?: string;
}
