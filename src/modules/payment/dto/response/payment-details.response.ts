import { PaymentComponent, PaymentMethod, PaymentType } from 'generated/prisma';

export interface PaymentAllocationItem {
  periodNumber: number;
  component: PaymentComponent;
  amount: number;
  description?: string;
}

export interface LoanBalanceSummary {
  remainingPrincipal: number;
  remainingInterest: number;
  remainingFees: number;
  remainingPenalty: number;
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
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  paidAt: string;
  allocation: PaymentAllocationItem[];
  loanBalance: LoanBalanceSummary;
  nextPayment: NextPaymentInfo;
  message: string;
}
