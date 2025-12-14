import { LoanStatus } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// -----------------------------
// Option A: nếu bạn có LoanStatus (Prisma / TS enum)
// -----------------------------
export const ListLoansQuerySchema = z.object({
  status: z.enum(Object.values(LoanStatus) as [string, ...string[]]).optional(),
  customerId: z.string().optional(),

  // page: accept string like "1", undefined -> default 1
  page: z.number().int().min(1).default(1).optional(),

  // limit: accept string -> default 20, max 100
  limit: z.number().int().min(1).max(100).default(20).optional(),
});

export class ListLoansQuery extends createZodDto(ListLoansQuerySchema) {}
