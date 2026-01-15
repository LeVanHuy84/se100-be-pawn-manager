import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const baseFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc', '']).optional(),
  search: z.string().optional(),
});

export class BaseFilterQuery extends createZodDto(baseFilterQuerySchema) {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  limit: number;

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
