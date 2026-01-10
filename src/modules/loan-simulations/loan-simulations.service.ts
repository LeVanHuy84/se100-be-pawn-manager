import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  LoanSimulationResponse,
  LoanSimulationScheduleItem,
} from './dto/response/loan-simulation.response';
import { LoanSimulationRequestDto } from './dto/request/loan-simulation.request';
import { RepaymentMethod } from 'generated/prisma';

@Injectable()
export class LoanSimulationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSimulation(
    payload: LoanSimulationRequestDto,
  ): Promise<LoanSimulationResponse> {
    const { loanAmount, totalFeeRate, loanTypeId, repaymentMethod } = payload;

    // 1) Load LoanType
    const loanType = await this.prisma.loanType.findUnique({
      where: { id: loanTypeId },
    });

    if (!loanType) {
      throw new UnprocessableEntityException(
        `LoanType with id "${loanTypeId}" not found`,
      );
    }

    const durationMonths = loanType.durationMonths;
    if (durationMonths <= 0) {
      throw new UnprocessableEntityException(
        `LoanType "${loanType.name}" has invalid durationMonths = ${durationMonths}`,
      );
    }

    const interestRateMonthly = loanType.interestRateMonthly.toNumber(); // %/month

    // Total fee = management fee + custody fees (calculated by caller)
    // Fee is fixed per month based on loan amount (pawn shop model)
    const monthlyFeeFixed = loanAmount * (totalFeeRate / 100);

    const schedule: LoanSimulationScheduleItem[] = [];
    let totalInterest = 0;
    let totalFees = 0;

    const today = new Date();

    // helper tạo dueDate
    const dueDateStr = (i: number) => {
      const dueDate = new Date(
        today.getFullYear(),
        today.getMonth() + i,
        today.getDate(),
      );
      return dueDate.toISOString().slice(0, 10);
    };

    // 2) Calculate schedule theo method
    if (repaymentMethod === RepaymentMethod.EQUAL_INSTALLMENT) {
      // gốc đều, lãi giảm dần
      const principalPerMonth = loanAmount / durationMonths;
      let remaining = loanAmount;

      for (let i = 1; i <= durationMonths; i++) {
        const beginningBalance = remaining;

        const interestAmount = beginningBalance * (interestRateMonthly / 100);
        const principalAmount =
          i === durationMonths ? beginningBalance : principalPerMonth;

        // Fee is fixed per month (pawn shop model)
        const feeAmount = monthlyFeeFixed;

        const totalAmount = principalAmount + interestAmount + feeAmount;

        totalInterest += interestAmount;
        totalFees += feeAmount;
        remaining = beginningBalance - principalAmount;

        schedule.push({
          periodNumber: i,
          dueDate: dueDateStr(i),
          beginningBalance: Math.round(beginningBalance),
          principalAmount: Math.round(principalAmount),
          interestAmount: Math.round(interestAmount),
          feeAmount: Math.round(feeAmount),
          totalAmount: Math.round(totalAmount),
        });
      }
    } else if (repaymentMethod === RepaymentMethod.INTEREST_ONLY) {
      // mỗi tháng: interest + fee; tháng cuối: interest + fee + full principal
      for (let i = 1; i <= durationMonths; i++) {
        const beginningBalance = loanAmount; // giữ nguyên tới cuối kỳ

        const interestAmount = loanAmount * (interestRateMonthly / 100);

        // Fee is fixed per month (pawn shop model)
        const feeAmount = monthlyFeeFixed;

        const principalAmount = i === durationMonths ? loanAmount : 0;
        const totalAmount = principalAmount + interestAmount + feeAmount;

        totalInterest += interestAmount;
        totalFees += feeAmount;

        schedule.push({
          periodNumber: i,
          dueDate: dueDateStr(i),
          beginningBalance: Math.round(beginningBalance),
          principalAmount: Math.round(principalAmount),
          interestAmount: Math.round(interestAmount),
          feeAmount: Math.round(feeAmount),
          totalAmount: Math.round(totalAmount),
        });
      }
    } else {
      // future-proof: nếu thêm enum mới mà quên handle
      throw new UnprocessableEntityException(
        `Unsupported repaymentMethod "${repaymentMethod}"`,
      );
    }

    // 3) Totals
    const totalRepayment = loanAmount + totalInterest + totalFees;

    // monthlyPayment:
    // - equal_installment: có thể dùng trung bình, hoặc dùng kỳ 1 (tuỳ UX)
    // - interest_only: trung bình sẽ “ảo” vì kỳ cuối to, nhưng vẫn ok để hiển thị thêm
    const monthlyPayment = totalRepayment / durationMonths;

    return {
      loanAmount,
      durationMonths,
      productType: loanType.name,

      appliedInterestRate: interestRateMonthly,
      appliedMgmtFeeRateMonthly: totalFeeRate,

      totalCustodyFeeRate: totalFeeRate,

      totalInterest: Math.round(totalInterest),
      totalFees: Math.round(totalFees),
      totalRepayment: Math.round(totalRepayment),
      monthlyPayment: Math.round(monthlyPayment),

      schedule,
    };
  }
}
