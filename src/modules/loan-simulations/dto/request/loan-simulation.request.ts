import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loanSimulationRequestSchema = z.object({
  amount: z.number().int().positive('amount must be > 0'),
  termMonths: z.number().int().min(1, 'termMonths must be at least 1'),
  productType: z.string().trim().min(1, 'productType is required'),
});

export class LoanSimulationRequestDto extends createZodDto(
  loanSimulationRequestSchema,
) {}
