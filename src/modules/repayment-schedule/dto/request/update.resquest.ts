import { RepaymentItemStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const updateRepaymentScheduleItemSchema = z
  .object({
    status: z.enum(RepaymentItemStatus).optional(),
    paidPrincipal: z.number().nonnegative().optional(),
    paidInterest: z.number().nonnegative().optional(),
    paidFee: z.number().nonnegative().optional(),
    paidAt: z.iso.datetime().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.paidPrincipal !== undefined ||
      data.paidInterest !== undefined ||
      data.paidFee !== undefined ||
      data.paidAt !== undefined,
    { message: 'At least one field must be provided' },
  );

export class UpdateRepaymentScheduleItemDto extends createZodDto(
  updateRepaymentScheduleItemSchema,
) {}
