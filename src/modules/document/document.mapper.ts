import { DocumentRecord } from '../../../generated/prisma';
import { DocumentResponse } from './dto/response/document.response';

export class DocumentMapper {
  static toResponse(document: DocumentRecord): DocumentResponse {
    return {
      id: document.id,
      entityType: document.entityType,
      entityId: document.entityId,
      docType: document.docType,
      docNumber: document.docNumber,
      issuedDate: document.issuedDate,
      expiryDate: document.expiryDate || undefined,
      fileUrl: document.fileUrl,
      filePublicId: document.filePublicId,
      isValid: document.isValid,
      createdAt: document.createdAt,
    };
  }

  static toResponseList(documents: DocumentRecord[]): DocumentResponse[] {
    return documents.map((doc) => this.toResponse(doc));
  }
}
