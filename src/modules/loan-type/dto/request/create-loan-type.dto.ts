import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateLoanTypeSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  durationMonths: z.number().min(1, 'duration must be at least 1 month'),
  interestRateMonthly: z.number().min(0, 'interest rate must be at least 0%'),
});

export class CreateLoanTypeDto extends createZodDto(CreateLoanTypeSchema) {}
