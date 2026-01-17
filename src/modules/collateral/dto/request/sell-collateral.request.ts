import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SellCollateralSchema = z.object({
  sellPrice: z.coerce.number().int().min(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']).optional().default('CASH'),
});

export class SellCollateralRequest extends createZodDto(SellCollateralSchema) {}
