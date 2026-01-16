import { createZodDto } from 'nestjs-zod';
import { CreateLoanTypeSchema } from './create-loan-type.dto';

export const UpdateLoanTypeSchema = CreateLoanTypeSchema.partial();

export class UpdateLoanTypeDto extends createZodDto(UpdateLoanTypeSchema) {}
