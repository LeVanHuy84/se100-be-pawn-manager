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
  durationMonths: number;
  productType: string;

  appliedInterestRate: number;
  appliedMgmtFeeRateMonthly: number;
  totalCustodyFeeRate: number;

  totalInterest: number;
  totalFees: number;
  totalRepayment: number;
  monthlyPayment: number;

  schedule: LoanSimulationScheduleItem[];
}
