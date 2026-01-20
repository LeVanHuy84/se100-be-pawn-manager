import { LoanStatus } from 'generated/prisma';
import {
  LoanResponseDto,
  LoanSummaryResponseDto,
} from './dto/response/loan.response';
import { CollateralMapper } from '../collateral/collateral.mapper';

export class LoanMapper {
  static toLoanResponse(loan: any): LoanResponseDto {
    return {
      id: loan.id,
      loanCode: loan.loanCode,
      customerId: loan.customerId,

      storeId: loan.storeId,
      storeName: loan.store?.name,

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
      activatedAt: loan.activatedAt?.toISOString() || null,
      notes: loan.notes,

      createdBy: loan.createdBy,

      createdAt: loan.createdAt?.toISOString() || null,
      updatedAt: loan.updatedAt?.toISOString() || null,

      collateral: CollateralMapper.toResponseList(loan.collaterals || []),
      customer: loan.customer,
    };
  }

  static toLoanSummaryResponse(loan: any): LoanSummaryResponseDto {
    return {
      id: loan.id,
      loanCode: loan.loanCode,
      customerId: loan.customerId,
      storeName: loan.store?.name,
      loanTypeName: loan.loanType.name,
      status: loan.status as LoanStatus,
      repaymentMethod: loan.repaymentMethod,
      loanAmount: loan.loanAmount.toNumber(),
      durationMonths: loan.durationMonths,
      totalRepayment: loan.totalRepayment.toNumber(),
      monthlyPayment: loan.monthlyPayment.toNumber(),
      startDate: loan.startDate?.toISOString().split('T')[0] || null,
      activatedAt: loan.activatedAt?.toISOString() || null,
      createdAt: loan.createdAt?.toISOString() || null,
    };
  }

  static toLoanSummaryResponseList(loans: any[]): LoanSummaryResponseDto[] {
    return loans.map(this.toLoanSummaryResponse);
  }

  static toLoanResponseList(loans: any[]): LoanResponseDto[] {
    return loans.map(this.toLoanResponse);
  }
}
