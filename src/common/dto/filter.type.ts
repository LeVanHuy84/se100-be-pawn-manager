import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from './pagination.type';
import { SortQuery } from './sort.type';

export class BaseFilterQuery {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Field name to sort by',
    example: 'createdAt',
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc', ''],
    example: 'desc',
  })
  sortOrder?: 'asc' | 'desc' | '';

  @ApiPropertyOptional({
    description: 'Search keyword',
    example: 'John Doe',
  })
  search?: string;
}
