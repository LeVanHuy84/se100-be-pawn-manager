import { CustomerType } from '../../enum/customer-type.enum';

export interface ActiveLoan {
  id: string;
  loanCode: string;
  loanAmount: number;
  remainingAmount: number;
  status: string;
  startDate: string; // YYYY-MM-DD
}

export interface LoanHistory {
  totalLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  defaultCount: number;
}

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
  activeLoans?: ActiveLoan[];
  loanHistory?: LoanHistory;
  images?: Record<string, string>[];
}
