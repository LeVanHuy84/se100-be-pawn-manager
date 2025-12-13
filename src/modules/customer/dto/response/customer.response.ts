import { CustomerType } from '../../enum/customer-type.enum';

export class ActiveLoan {
  id: string;
  loanCode: string;
  loanAmount: number;
  remainingAmount: number;
  status: string;
  startDate: string; // YYYY-MM-DD
}

export class LoanHistory {
  totalLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  defaultCount: number;
}

export class CustomerResponse {
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
