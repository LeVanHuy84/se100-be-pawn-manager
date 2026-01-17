export interface LiquidationPaymentResponse {
  // Collateral info
  collateralId: string;
  sellPrice: number;
  sellDate: string;

  // Loan info
  loanId: string;
  loanCode: string;

  // Payment details
  paymentId: string;
  amountPaidToLoan: number;
  remainingAmount: number;
  excessAmount: number; // Số tiền dư trả lại khách

  // Loan status after liquidation
  loanStatus: string;
  loanRemainingAmount: number;

  message: string;
}
