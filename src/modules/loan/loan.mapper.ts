import { LoanStatus } from 'generated/prisma';
import { LoanResponse } from './dto/response/loan.response';
import { CollateralMapper } from '../collateral/collateral.mapper';

export class LoanMapper {
  static toLoanResponse(loan: any): LoanResponse {
    return {
      id: loan.id,
      customerId: loan.customerId,
      loanTypeId: loan.loanTypeId,
      status: loan.status as LoanStatus,

      repaymentMethod: loan.repaymentMethod,

      loanAmount: loan.loanAmount,
      durationMonths: loan.durationMonths,

      appliedInterestRate: loan.appliedInterestRate,
      totalFees: loan.totalFees,
      totalInterest: loan.totalInterest,
      totalRepayment: loan.totalRepayment,
      monthlyPayment: loan.monthlyPayment,
      latePaymentPenaltyRate: loan.latePaymentPenaltyRate,

      startDate: loan.startDate.toISOString().split('T')[0] || null,
      activatedAt: loan.activatedAt.toISOString().split('T')[0] || null,
      notes: loan.notes,

      createdAt: loan.createdAt.toISOString().split('T')[0] || null,
      updatedAt: loan.updatedAt.toISOString().split('T')[0] || null,

      collateral: loan.collateral?.map((c: any) =>
        CollateralMapper.toResponse(c),
      ),
      //   documents?: DocumentResponse[];
    };
  }

  static toLoanResponseList(loans: any[]): LoanResponse[] {
    return loans.map(this.toLoanResponse);
  }
}
