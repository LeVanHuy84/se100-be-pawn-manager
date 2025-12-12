import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EntityType } from '../../enum/entity-type.enum';
import { DocumentType } from '../../enum/document-type.enum';

const UploadDocumentSchema = z.object({
  entityType: z.enum(Object.values(EntityType) as [string, ...string[]], { message: 'i have to search the id in entire 3 tables because you think send the id is enough? No i dont think so' }),
  entityId: z.string().uuid(),
  docType: z.enum(Object.values(DocumentType) as [string, ...string[]]),
  docNumber: z.string().optional(),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

export class UploadDocumentDto extends createZodDto(UploadDocumentSchema) {}
