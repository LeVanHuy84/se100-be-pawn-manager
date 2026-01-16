import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from 'src/common/dto/pagination.type';

export class CollateralTypeResponse {
  id: number;
  name: string;
  custodyFeeRateMonthly: number;
  totalCollaterals?: number;
}

export class CollateralTypeListResponse {
  @ApiProperty({
    description: 'List of collateral types',
    type: [CollateralTypeResponse],
  })
  data: CollateralTypeResponse[];
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
