import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AssetType } from '../../enum/asset-type.enum';
import { AssetStatus } from '../../enum/asset-status.enum';

export const CollateralQuerySchema = z.object({
  status: z
    .enum(Object.values(AssetStatus) as [string, ...string[]])
    .optional(),
  assetType: z.enum(Object.values(AssetType) as [string, ...string[]]).optional(),
  loanId: z.string().uuid().optional(),
  isSold: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
});

export class CollateralQueryDTO extends createZodDto(CollateralQuerySchema) {}
