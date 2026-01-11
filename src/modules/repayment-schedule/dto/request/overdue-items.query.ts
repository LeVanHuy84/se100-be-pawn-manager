import { ApiPropertyOptional } from '@nestjs/swagger';
import { BaseFilterQuery } from 'src/common/dto/filter.type';

export class OverdueItemsQuery extends BaseFilterQuery {
  @ApiPropertyOptional({
    description: 'Minimum days overdue',
    example: 1,
    minimum: 1,
    default: 1,
  })
  minDaysOverdue?: number;
}
