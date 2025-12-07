import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EntityType } from '../../enum/entity-type.enum';

const UploadDocumentSchema = z.object({
  entityType: z.enum(Object.values(EntityType) as [string, ...string[]]),
  entityId: z.string().uuid({
    message: 'Entity ID must be a valid UUID',
  }),
  docType: z.enum(Object.values(DocumentType) as [string, ...string[]]),
  docNumber: z.string().optional(),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  description: z.string().optional(),
});

export class UploadDocumentDto extends createZodDto(UploadDocumentSchema) {}
