import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// query zod schema and class dtos for audit log listing
export const AuditLogQuerySchema = z.object({
  actorId: z.string().optional().describe('Filter by employee ID'),
  action: z.string().optional().describe('Filter by action type'),
  startDate: z
    .string()
    .optional()
    .describe('Filter by start date (ISO format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO format)'),
  page: z.number().min(1).default(1).describe('Page number for pagination'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe('Number of items per page'),
});

export class AuditLogQueryDto extends createZodDto(AuditLogQuerySchema) {}
