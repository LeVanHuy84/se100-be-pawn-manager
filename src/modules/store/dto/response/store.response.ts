import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from 'src/common/dto/pagination.type';

export class StoreResponse {
  id: string;
  name: string;
  address?: string;
  storeInfo: Record<string, any>;
  isActive: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime

  // Statistics (optional, for detailed view)
  totalCollaterals?: number;
  totalLoans?: number;
  activeLoans?: number;
}

export class StoreListResponse {
  @ApiProperty({ description: 'List of stores', type: [StoreResponse] })
  data: StoreResponse[];
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
