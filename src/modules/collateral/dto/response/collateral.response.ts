import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from 'src/common/dto/pagination.type';
import { ImageItem } from 'src/common/interfaces/media.interface';
import Api from 'twilio/lib/rest/Api';

export class CollateralAssetResponse {
  id: string;
  collateralTypeId: number;
  ownerName: string;
  status: string;
  loanId?: string | null;
  storageLocation?: string | null;
  receivedDate?: string | null;
  appraisedValue?: number | null;
  ltvRatio?: number | null;
  appraisalDate?: string | null;
  appraisalNotes?: string | null;
  sellPrice?: number | null;
  sellDate?: string | null;
  images?: ImageItem[] | null;
  collateralInfo?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export class CollateralAssetListResponse {
  @ApiProperty({
    description: 'List of collateral assets',
    type: [CollateralAssetResponse],
  })
  data: CollateralAssetResponse[];
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
