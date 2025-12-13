export class CollateralAssetResponse {
  id: string;
  collateralTypeId: number;
  ownerName: string;
  status: string;
  loanId?: string | null;
  storageLocation?: string | null;
  receivedDate?: string | null;
  appraisedValue?: number | null;
  ltvRatio?: number | null;
  appraisalDate?: string | null;
  appraisalNotes?: string | null;
  sellPrice?: number | null;
  sellDate?: string | null;
  images?: Record<string, string>[] | null;
  collateralInfo?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}
