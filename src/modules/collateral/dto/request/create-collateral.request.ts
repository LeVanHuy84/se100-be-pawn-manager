import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AssetStatus } from '../../enum/asset-status.enum';

export const CreateCollateralSchema = z.object({
  collateralTypeId: z.coerce.number().int(),
  ownerName: z.string().min(1),
  collateralInfo: z.record(z.string(), z.any()).optional(),
  status: z.enum(Object.values(AssetStatus) as [string, ...string[]]).optional(),
  loanId: z.string().uuid(),
  storageLocation: z.string().optional(),
  receivedDate: z.string().optional(),
});

export class CreateCollateralDTO extends createZodDto(CreateCollateralSchema) {}
