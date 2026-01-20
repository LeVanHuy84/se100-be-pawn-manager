import { ApiPropertyOptional } from '@nestjs/swagger';

export type SortOrder = 'asc' | 'desc' | '';

export class SortQuery {
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
  sortOrder?: SortOrder;
}
