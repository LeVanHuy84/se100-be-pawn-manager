import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMeta } from './pagination.type';

// Keep the interface for backward compatibility with existing code
// export interface BaseResult<T> {
//   data: T;
//   meta?: PaginationMeta;
// }

// Swagger-compatible base response class (not used directly in controllers)
// Individual modules should create concrete response classes
export class BaseResult<T> {
  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiPropertyOptional({ type: () => PaginationMeta })
  meta?: PaginationMeta;
}
