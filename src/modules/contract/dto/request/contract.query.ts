    import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ContractQuerySchema = z.object({
  loanId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export class ContractQueryDto extends createZodDto(ContractQuerySchema) {}
