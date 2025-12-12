export interface DocumentResponse {
  documentId: string;
  entityType: string;
  entityId: string;
  docType: string;
  docNumber?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  filePath: string;
  filePublicId: string;
  isValid: boolean;
  uploadedAt: Date;
}
