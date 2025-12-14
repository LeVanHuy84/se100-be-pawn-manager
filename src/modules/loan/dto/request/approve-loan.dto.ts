import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ApproveLoanSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED']),
  note: z.string().optional(),
});

export class ApproveLoanDto extends createZodDto(ApproveLoanSchema) {}
