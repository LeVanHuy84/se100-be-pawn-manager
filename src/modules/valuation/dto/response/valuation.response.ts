export interface ValuationResponse {
  assetType: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  suggestedMarketValue: number;
  minValue: number;
  maxValue: number;
  confidenceLevel: string;
  ltvRatio: number;
  maxLoanAmount: number;
  depreciationRate: number;
  valuationDate: Date;
  notes: string;
}
