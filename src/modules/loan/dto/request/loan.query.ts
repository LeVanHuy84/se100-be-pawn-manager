import { LoanStatus } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// -----------------------------
// Option A: nếu bạn có LoanStatus (Prisma / TS enum)
// -----------------------------
export const ListLoansQuerySchema = z.object({
  status: z.enum(LoanStatus).optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class ListLoansQuery extends createZodDto(ListLoansQuerySchema) {}
