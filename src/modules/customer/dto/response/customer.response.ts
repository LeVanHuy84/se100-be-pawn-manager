import { CustomerType } from '../../enum/customer-type.enum';

export interface CustomerResponse {
  id: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  nationalId: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType: CustomerType;
  monthlyIncome: number;
  creditScore?: number;
  createdAt: string; // ISO datetime
}
