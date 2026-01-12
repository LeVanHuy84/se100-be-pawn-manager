export class StoreResponse {
  id: string;
  name: string;
  address?: string;
  storeInfo: Record<string, any>;
  isActive: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  
  // Statistics (optional, for detailed view)
  totalCollaterals?: number;
  totalLoans?: number;
  activeLoans?: number;
}
