import { create } from 'domain';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateLiquidationSchema = z.object({
  collateralId: z.string().uuid(),
  minimumSalePrice: z.coerce.number().int().min(0).optional(),
  reason: z.string().optional(),
});

export class CreateLiquidationRequest extends createZodDto(
  CreateLiquidationSchema,
) {}
