import { PaymentComponent } from '@prisma/client';

export interface PaymentAllocationItem {
  component: PaymentComponent;
  amount: number;
  description?: string;
}

export interface LoanBalanceSummary {
  totalPaidAmount: number;
  remainingPrincipal: number;
  remainingInterest: number;
  remainingFees: number;
  totalRemaining: number;
}

export interface NextPaymentInfo {
  dueDate: string | null; // nếu đã trả hết thì null
  amount: number | null;
  periodNumber: number | null;
}

export interface PaymentResponse {
  transactionId: string;
  loanId: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  allocation: PaymentAllocationItem[];
  loanBalance: LoanBalanceSummary;
  nextPayment: NextPaymentInfo;
  message: string;
}
