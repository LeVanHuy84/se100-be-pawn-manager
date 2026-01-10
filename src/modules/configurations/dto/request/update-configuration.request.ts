import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const updateConfigurationSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

export class UpdateConfigurationDto extends createZodDto(
  updateConfigurationSchema,
) {
  @ApiProperty({
    description: 'New value as string (will be validated against dataType)',
    example: '20.0',
  })
  value: string;

  @ApiProperty({
    description: 'Optional updated description for this parameter',
    example: 'Legal maximum annual interest rate in Vietnam (%)',
    required: false,
  })
  description?: string;
}
