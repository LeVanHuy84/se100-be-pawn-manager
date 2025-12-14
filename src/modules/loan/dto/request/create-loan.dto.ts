import { z } from 'zod';
import { RepaymentMethod } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';

export const CreateAssetSchema = z.object({
  assetTypeId: z.number().int(),
  ownerName: z.string().min(1),

  assetInfo: z.record(z.string(), z.any()),

  images: z.any(),

  storageLocation: z.string().optional(),
  receivedDate: z.coerce.date().optional(),

  // appraisal
  appraisedValue: z.coerce.number().optional(),
  ltvRatio: z.coerce.number().optional(),
  appraisalDate: z.coerce.date().optional(),
  appraisalNotes: z.string().optional(),
});

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

  // ---- ASSETS ----
  assets: z.array(CreateAssetSchema).min(1),
});

export class CreateLoanDto extends createZodDto(CreateLoanSchema) {}
