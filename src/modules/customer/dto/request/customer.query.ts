import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CustomerType } from '../../enum/customer-type.enum';

export const CustomerQuerySchema = z.object({
  search: z.string().optional(),
  customerType: z
    .enum(Object.values(CustomerType) as [string, ...string[]])
    .optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
});

export class CustomerQueryDTO extends createZodDto(CustomerQuerySchema) {}
