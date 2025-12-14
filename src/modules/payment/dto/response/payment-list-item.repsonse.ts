import { PaymentMethod, PaymentType } from 'generated/prisma';

export interface PaymentListItem {
  id: string;
  loanId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  paidAt: string;
  referenceCode?: string | null;
}
