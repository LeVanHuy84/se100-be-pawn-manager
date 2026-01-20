import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateCustomerSchema } from './create-customer.request';

// Update schema: partial of create, allow updating any subset of fields
export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export class UpdateCustomerRequest extends createZodDto(UpdateCustomerSchema) {}
