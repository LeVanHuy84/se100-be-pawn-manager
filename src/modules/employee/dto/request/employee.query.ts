import { z } from 'zod';
import { EmployeeStatus } from '../../enum/employee-status.enum';
import { createZodDto } from 'nestjs-zod';

export const EmployeeQuerySchema = z.object({
  status: z
    .enum(Object.values(EmployeeStatus) as [string, ...string[]])
    .optional(),
  storeId: z.string().optional(),
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
});

export class EmployeeQueryDTO extends createZodDto(EmployeeQuerySchema) {}
