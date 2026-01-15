import { z } from 'zod';
import { EmployeeStatus } from '../../enum/employee-status.enum';
import { createZodDto } from 'nestjs-zod';

export const EmployeeQuerySchema = z.object({
  q: z.string().optional().describe('Search keyword: name, email, phone'),
  status: z
    .enum(Object.values(EmployeeStatus) as [string, ...string[]])
    .optional(),
  storeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class EmployeeQueryDTO extends createZodDto(EmployeeQuerySchema) {}
