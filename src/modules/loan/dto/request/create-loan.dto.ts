import { z } from 'zod';
import { RepaymentMethod } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';

export const CreateLoanSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),

  // ---- LOAN TERMS (SNAPSHOT) ----
  loanAmount: z.coerce.number().positive(),
  repaymentMethod: z.enum(
    Object.values(RepaymentMethod) as [string, ...string[]],
  ),
  loanTypeId: z.number().int(),

  // ---- OPTIONAL ----
  notes: z.string().optional(),

  // ---- COLLATERALS ----
  collateralIds: z
    .array(z.string().min(1))
    .min(1, 'At least one collateralId is required'),
});

export class CreateLoanDto extends createZodDto(CreateLoanSchema) {}
