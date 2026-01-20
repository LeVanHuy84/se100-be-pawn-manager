import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateCollateralTypeSchema = z.object({
  name: z.string().min(1, 'Collateral type name is required').max(200),
  custodyFeeRateMonthly: z.coerce
    .number()
    .min(0, 'Custody fee rate must be non-negative')
    .max(1, 'Custody fee rate cannot exceed 100%'),
});

export class CreateCollateralTypeDTO extends createZodDto(
  CreateCollateralTypeSchema,
) {}
