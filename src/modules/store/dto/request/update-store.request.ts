import { createZodDto } from 'nestjs-zod';
import { CreateStoreSchema } from './create-store.request';

// Update schema: partial of create, allow updating any subset of fields
export const UpdateStoreSchema = CreateStoreSchema.partial();

export class UpdateStoreDTO extends createZodDto(UpdateStoreSchema) {}
