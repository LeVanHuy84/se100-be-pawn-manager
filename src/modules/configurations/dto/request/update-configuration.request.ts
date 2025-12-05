import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const updateConfigurationSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

export class UpdateConfigurationDto extends createZodDto(
  updateConfigurationSchema,
) {}
