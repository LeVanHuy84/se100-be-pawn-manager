import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((val) => emailRegex.test(val), {
      message: 'Invalid email format',
    }),
  password: z.string().min(6).max(100),
  phoneNumber: z.string().min(10).max(15).optional(),
  role: z.string().min(1).max(50),
  hireDate: z
    .string()
    .optional()
    .refine((val) => !val || isoDateRegex.test(val), {
      message: 'hireDate must be in YYYY-MM-DD format',
    }),
});

export class CreateEmployeeDTO extends createZodDto(CreateEmployeeSchema) {}
