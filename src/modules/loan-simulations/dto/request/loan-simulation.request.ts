import { RepaymentMethod } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loanSimulationRequestSchema = z.object({
  loanAmount: z.number().int().positive('amount must be > 0'),
  totalCustodyFeeRate: z
    .number()
    .nonnegative('totalCustodyFeePercent must be >= 0'),
  loanTypeId: z.number().int('loanTypeId must be an integer'),
  repaymentMethod: z.enum(RepaymentMethod),
});

export class LoanSimulationRequestDto extends createZodDto(
  loanSimulationRequestSchema,
) {}
