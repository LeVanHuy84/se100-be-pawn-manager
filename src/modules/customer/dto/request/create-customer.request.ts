import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CustomerType } from '../../enum/customer-type.enum';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAdult(dateString: string) {
  if (!isoDateRegex.test(dateString)) return false;
  const d = new Date(dateString + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 18;
}

export const CreateCustomerSchema = z.object({
  fullName: z.string().min(1).max(200),
  dob: z
    .string()
    .refine((val) => isoDateRegex.test(val), {
      message: 'DOB must be in YYYY-MM-DD format',
    })
    .refine((val) => isAdult(val), { message: 'Customer must be at least 18 years old' }),
  nationalId: z.string().min(6).max(30),
  phone: z.string().min(10).max(15),
  email: z
      .string()
      .min(1, 'Email is required')
      .refine((val) => emailRegex.test(val), {
        message: 'Invalid email format',
      }).optional(),
  address: z.string().optional(),
  customerType: z.enum(Object.values(CustomerType) as [string, ...string[]]),
  monthlyIncome: z.number().int().min(3000000),
  creditScore: z.number().int().min(0).max(1000).optional(),
});

export class CreateCustomerDTO extends createZodDto(CreateCustomerSchema) {}
