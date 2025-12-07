export interface CollateralAssetResponse {
  id: string;
  assetType: string;
  ownerName: string;
  brandModel: string;
  serialNumber?: string | null;
  plateNumber?: string | null;
  marketValue?: number | null;
  status: string;
  loanId?: string | null;
  storageLocation?: string | null;
  receivedDate?: string | null;
  releasedDate?: string | null;
  appraisedValue?: number | null;
  ltvRatio?: number | null;
  appraisalDate?: string | null;
  appraisalNotes?: string | null;
  validUntil?: string | null;
  sellPrice?: number | null;
  isSold: boolean;
  sellDate?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}
