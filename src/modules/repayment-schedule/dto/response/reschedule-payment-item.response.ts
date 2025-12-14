import { RepaymentItemStatus } from 'generated/prisma';

export interface RepaymentScheduleItemResponse {
  id: string;
  loanId: string;
  periodNumber: number;
  dueDate: string; // 'YYYY-MM-DD'
  beginningBalance: number;
  principalAmount: number;
  interestAmount: number;
  feeAmount: number; // nếu không dùng thì cho 0
  totalAmount: number;
  status: RepaymentItemStatus;
  paidPrincipal: number;
  paidInterest: number;
  paidFee: number;
  paidAt: string | null;
}
