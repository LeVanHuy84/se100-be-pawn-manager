import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AssetCondition } from '../../enum/asset-condition.enum';

const ValuationRequestSchema = z.object({
  collateralTypeId: z.coerce
    .number()
    .int()
    .positive('Collateral Type ID must be a positive integer'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce
    .number()
    .int()
    .min(1990, 'Year must be 1990 or later')
    .max(new Date().getFullYear(), `Year cannot be in the future`),
  condition: z.enum(Object.values(AssetCondition) as [string, ...string[]]),
  mileage: z.coerce
    .number()
    .int()
    .min(0, 'Mileage must be positive')
    .optional(),
});

export class ValuationRequestDto extends createZodDto(ValuationRequestSchema) {}
