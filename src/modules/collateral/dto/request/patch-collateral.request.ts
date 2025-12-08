import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AssetStatus } from '../../enum/asset-status.enum';

export const PatchCollateralSchema = z.object({
  status: z.enum(Object.values(AssetStatus) as [string, ...string[]]).optional(),
  storageLocation: z.string().optional(),
  marketValue: z.coerce.number().int().min(0).optional(),
  appraisedValue: z.coerce.number().int().min(0).optional(),
  appraisalNotes: z.string().optional(),
  sellPrice: z.coerce.number().int().min(0).optional(),
  isSold: z.coerce.boolean().optional(),
  updatedBy: z.string().optional(),
});

export class PatchCollateralDTO extends createZodDto(PatchCollateralSchema) {}
