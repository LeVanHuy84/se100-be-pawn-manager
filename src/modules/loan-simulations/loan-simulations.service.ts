import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  LoanSimulationResponse,
  LoanSimulationScheduleItem,
} from './dto/response/loan-simulation.response';
import { LoanSimulationRequestDto } from './dto/request/loan-simulation.request';

@Injectable()
export class LoanSimulationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSimulation(
    payload: LoanSimulationRequestDto,
  ): Promise<LoanSimulationResponse> {
    const { amount, termMonths, productType } = payload;

    const { interestRate, mgmtFeeRate, custodyFeeRate } =
      await this.getRatesFromProductType(productType);

    // gốc đều, lãi trên dư nợ, fee %/tháng trên loanAmount (cố định mỗi tháng)
    const principalPerMonth = amount / termMonths;

    const monthlyMgmtFee = amount * (mgmtFeeRate / 100);
    const monthlyCustodyFee = amount * (custodyFeeRate / 100);
    const monthlyFee = monthlyMgmtFee + monthlyCustodyFee;

    const schedule: LoanSimulationScheduleItem[] = [];
    let remaining = amount;
    let totalInterest = 0;
    let totalFees = 0;

    const today = new Date();

    for (let i = 1; i <= termMonths; i++) {
      const beginningBalance = remaining;

      const interestAmount = beginningBalance * (interestRate / 100);
      const principalAmount =
        i === termMonths ? beginningBalance : principalPerMonth;
      const feeAmount = monthlyFee;

      const totalAmount = principalAmount + interestAmount + feeAmount;

      totalInterest += interestAmount;
      totalFees += feeAmount;
      remaining = beginningBalance - principalAmount;

      const dueDate = new Date(
        today.getFullYear(),
        today.getMonth() + i,
        today.getDate(),
      );
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      schedule.push({
        periodNumber: i,
        dueDate: dueDateStr,
        beginningBalance: Math.round(beginningBalance),
        principalAmount: Math.round(principalAmount),
        interestAmount: Math.round(interestAmount),
        feeAmount: Math.round(feeAmount),
        totalAmount: Math.round(totalAmount),
      });
    }

    const totalRepayment = totalInterest + totalFees + amount;
    const monthlyPayment = totalRepayment / termMonths;

    return {
      loanAmount: amount,
      termMonths,
      productType, // string

      appliedInterestRate: interestRate,
      appliedMgmtFee: mgmtFeeRate,
      appliedCustodyFee: custodyFeeRate,

      totalInterest: Math.round(totalInterest),
      totalFees: Math.round(totalFees),
      totalRepayment: Math.round(totalRepayment),
      monthlyPayment: Math.round(monthlyPayment),

      schedule,
    };
  }
  private async getRatesFromProductType(productTypeCode: string): Promise<{
    interestRate: number;
    mgmtFeeRate: number;
    custodyFeeRate: number;
  }> {
    const formatProductTypeCode = productTypeCode.trim().toUpperCase();
    const productType = await this.prisma.loanProductType.findUnique({
      where: { name: formatProductTypeCode },
    });

    if (!productType) {
      throw new UnprocessableEntityException(
        `Unknown productType "${productTypeCode}"`,
      );
    }

    return {
      interestRate: productType.interestRateMonthly.toNumber(),
      mgmtFeeRate: productType.mgmtFeeRateMonthly.toNumber(),
      custodyFeeRate: productType.custodyFeeRateMonthly.toNumber(),
    };
  }
}
