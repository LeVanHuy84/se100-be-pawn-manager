export interface DocumentResponse {
  id: string;
  entityType: string;
  entityId: string;
  docType: string;
  docNumber?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  fileUrl: string;
  filePublicId: string;
  isValid: boolean;
  createdAt: Date;
}
