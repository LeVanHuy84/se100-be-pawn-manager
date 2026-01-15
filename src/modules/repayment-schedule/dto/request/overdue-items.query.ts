import { ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { baseFilterQuerySchema } from 'src/common/dto/filter.type';
import { z } from 'zod';

export const overdueItemsQuerySchema = baseFilterQuerySchema.extend({
  minDaysOverdue: z.coerce.number().int().min(1).default(1).optional(),
});

export class OverdueItemsQuery extends createZodDto(overdueItemsQuerySchema) {
  @ApiPropertyOptional({
    description: 'Minimum days overdue',
    example: 1,
    minimum: 1,
    default: 1,
  })
  minDaysOverdue?: number;
}
