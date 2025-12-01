import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateEmployeeSchema, isoDateRegex } from './create-employee.request';
import { EmployeeStatus } from '../../enum/employee-status.enum';

export const UpdateEmployeeSchema = CreateEmployeeSchema.omit({
  hireDate: true,
})
  .extend({
    status: z.enum(Object.values(EmployeeStatus) as [string, ...string[]]),
    terminatedDate: z.string().refine((val) => !val || isoDateRegex.test(val), {
      message: 'hireDate must be in YYYY-MM-DD format',
    }),
  })
  .partial();

export class UpdateEmployeeRequest extends createZodDto(UpdateEmployeeSchema) {}
