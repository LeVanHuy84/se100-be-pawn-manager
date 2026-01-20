import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ParameterGroup } from '../../enums/parameter-group.enum';

export const listConfigurationsQuerySchema = z.object({
  group: z.enum(ParameterGroup).optional(),
});

export class ListConfigurationsQueryDto extends createZodDto(
  listConfigurationsQuerySchema,
) {}
