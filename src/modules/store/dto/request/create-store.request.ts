import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(200),
  address: z.string().max(500).optional(),
  storeInfo: z.preprocess((val) => {
    if (typeof val === 'string' && val.length > 0) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
    return val;
  }, z.record(z.string(), z.any()).optional()),
  isActive: z.boolean().optional().default(true),
});

export class CreateStoreDTO extends createZodDto(CreateStoreSchema) {}
