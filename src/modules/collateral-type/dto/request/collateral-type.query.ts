import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CollateralTypeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
});

export class CollateralTypeQueryDTO extends createZodDto(
  CollateralTypeQuerySchema,
) {}
