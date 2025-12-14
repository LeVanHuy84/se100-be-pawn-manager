import { LoanStatus, RepaymentMethod } from 'generated/prisma';
import { CollateralAssetResponse } from 'src/modules/collateral/dto/response/collateral.response';

export interface LoanResponse {
  id: string;
  customerId: string;

  loanAmount: number;
  repaymentMethod: RepaymentMethod;

  loanTypeId: number;
  durationMonths: number;
  appliedInterestRate: number;
  latePaymentPenaltyRate: number;

  totalInterest: number;
  totalFees: number;
  totalRepayment: number;
  monthlyPayment: number;

  status: LoanStatus;

  startDate: string;
  activatedAt?: string | null;
  notes?: string | null;

  createdAt: string;
  updatedAt: string;

  collateral?: CollateralAssetResponse[];
}
