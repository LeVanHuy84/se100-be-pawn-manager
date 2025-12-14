import z from 'zod';
import { CreateAssetSchema, CreateLoanSchema } from './create-loan.dto';
import { createZodDto } from 'nestjs-zod';

export const UpdateAssetSchema = CreateAssetSchema.extend({
  id: z.string().optional(),
}).partial();

export const UpdateLoanSchema = CreateLoanSchema.extend({
  assets: z.array(UpdateAssetSchema).optional(),
}).partial();

export class UpdateLoanDto extends createZodDto(UpdateLoanSchema) {}
