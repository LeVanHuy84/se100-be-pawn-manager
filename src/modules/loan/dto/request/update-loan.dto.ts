import { CreateLoanSchema } from './create-loan.dto';
import { createZodDto } from 'nestjs-zod';

export const UpdateLoanSchema = CreateLoanSchema.omit({
  customerId: true,
}).partial();

export class UpdateLoanDto extends createZodDto(UpdateLoanSchema) {}
