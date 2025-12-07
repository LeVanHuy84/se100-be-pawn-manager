import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AssetStatus } from '../../enum/asset-status.enum';

export const UpdateLocationSchema = z.object({
  storageLocation: z.string().min(1),
  status: z.enum(Object.values(AssetStatus) as [string, ...string[]]).optional(),
  // check things carefully pls, notes have nothing to do here
  notes: z.string().optional(),
  updatedBy: z.string().min(1).optional(),
});

export class UpdateLocationRequest extends createZodDto(UpdateLocationSchema) {}
