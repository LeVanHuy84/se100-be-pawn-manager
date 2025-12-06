export interface LoanSimulationScheduleItem {
  periodNumber: number;
  dueDate: string; // ISO string "YYYY-MM-DD"
  beginningBalance: number;
  principalAmount: number;
  interestAmount: number;
  feeAmount: number;
  totalAmount: number;
}

export interface LoanSimulationResponse {
  loanAmount: number;
  termMonths: number;
  productType: string;

  appliedInterestRate: number; // %/month
  appliedMgmtFee: number; // %/month or %/loanAmount (tùy business)
  appliedCustodyFee: number; // %/month or %/loanAmount

  totalInterest: number;
  totalFees: number;
  totalRepayment: number;
  monthlyPayment: number;

  schedule: LoanSimulationScheduleItem[];
}
