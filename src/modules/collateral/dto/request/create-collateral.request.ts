import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AssetType } from '../../enum/asset-type.enum';
import { AssetStatus } from '../../enum/asset-status.enum';

export const CreateCollateralSchema = z.object({
  assetType: z.enum(Object.values(AssetType) as [string, ...string[]]),
  ownerName: z.string().min(1),
  brandModel: z.string().min(1),
  serialNumber: z.string().optional(),
  plateNumber: z.string().optional(),
  marketValue: z.coerce.number().int().min(0).optional(),
  status: z.enum(Object.values(AssetStatus) as [string, ...string[]]).optional(),
  loanId: z.string().uuid().optional(),
  storageLocation: z.string().optional(),
  receivedDate: z.string().optional(),
  releasedDate: z.string().optional(),
//   condition: z.string().optional(),
  validUntil: z.string().optional(),
  createdBy: z.string().min(1).optional(),
});

export class CreateCollateralDTO extends createZodDto(CreateCollateralSchema) {}
