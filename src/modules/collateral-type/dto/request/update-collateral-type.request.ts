import { createZodDto } from 'nestjs-zod';
import { CreateCollateralTypeSchema } from './create-collateral-type.request';

export const UpdateCollateralTypeSchema =
  CreateCollateralTypeSchema.partial();

export class UpdateCollateralTypeDTO extends createZodDto(
  UpdateCollateralTypeSchema,
) {}
