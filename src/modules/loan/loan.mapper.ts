import { LoanStatus } from 'generated/prisma';
import { LoanResponse } from './dto/response/loan.response';
import { CollateralMapper } from '../collateral/collateral.mapper';

export class LoanMapper {
  static toLoanResponse(loan: any): LoanResponse {
    return {
      id: loan.id,
      customerId: loan.customerId,
      loanTypeId: loan.loanTypeId,
      loanTypeName: loan.loanType.name,

      status: loan.status as LoanStatus,

      repaymentMethod: loan.repaymentMethod,

      loanAmount: loan.loanAmount.toNumber(),
      durationMonths: loan.durationMonths,

      appliedInterestRate: loan.appliedInterestRate.toNumber(),
      totalFees: loan.totalFees.toNumber(),
      totalInterest: loan.totalInterest.toNumber(),
      totalRepayment: loan.totalRepayment.toNumber(),
      monthlyPayment: loan.monthlyPayment.toNumber(),
      latePaymentPenaltyRate: loan.latePaymentPenaltyRate.toNumber(),

      startDate: loan.startDate?.toISOString().split('T')[0] || null,
      activatedAt: loan.activatedAt?.toISOString().split('T')[0] || null,
      notes: loan.notes,

      createdAt: loan.createdAt?.toISOString().split('T')[0],
      updatedAt: loan.updatedAt?.toISOString().split('T')[0],

      collateral: CollateralMapper.toResponseList(loan.collaterals || []),
    };
  }

  static toLoanResponseList(loans: any[]): LoanResponse[] {
    return loans.map(this.toLoanResponse);
  }
}
