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
      const principalPerMonth = Math.round(loanAmount / durationMonths);
      let remaining = loanAmount;
      let totalPrincipalPaid = 0;

      for (let i = 1; i <= durationMonths; i++) {
        const beginningBalance = remaining;

        // Làm tròn từng khoản ngay khi tính
        const interestAmount = Math.round(
          beginningBalance * (interestRateMonthly / 100),
        );

        // Kỳ cuối: trả hết phần còn lại để đảm bảo tổng chính xác
        const principalAmount =
          i === durationMonths
            ? loanAmount - totalPrincipalPaid
            : principalPerMonth;

        // Fee is fixed per month (pawn shop model)
        const feeAmount = Math.round(monthlyFeeFixed);

        const totalAmount = principalAmount + interestAmount + feeAmount;

        totalInterest += interestAmount;
        totalFees += feeAmount;
        totalPrincipalPaid += principalAmount;
        remaining = beginningBalance - principalAmount;

        schedule.push({
          periodNumber: i,
          dueDate: dueDateStr(i),
          beginningBalance: Math.round(beginningBalance),
          principalAmount: Math.round(principalAmount),
          interestAmount: interestAmount,
          feeAmount: feeAmount,
          totalAmount: totalAmount,
        });
      }
    } else if (repaymentMethod === RepaymentMethod.INTEREST_ONLY) {
      // mỗi tháng: interest + fee; tháng cuối: interest + fee + full principal
      let totalInterestPaid = 0;
      let totalFeesPaid = 0;

      for (let i = 1; i <= durationMonths; i++) {
        const beginningBalance = loanAmount; // giữ nguyên tới cuối kỳ

        // Làm tròn từng khoản ngay khi tính
        let interestAmount = Math.round(
          loanAmount * (interestRateMonthly / 100),
        );

        // Fee is fixed per month (pawn shop model)
        let feeAmount = Math.round(monthlyFeeFixed);

        // Kỳ cuối: điều chỉnh interest và fee nếu có sai lệch tích lũy
        if (i === durationMonths) {
          const expectedTotalInterest = Math.round(
            loanAmount * (interestRateMonthly / 100) * durationMonths,
          );
          const expectedTotalFees = Math.round(
            monthlyFeeFixed * durationMonths,
          );

          interestAmount = expectedTotalInterest - totalInterestPaid;
          feeAmount = expectedTotalFees - totalFeesPaid;
        }

        const principalAmount = i === durationMonths ? loanAmount : 0;
        const totalAmount = principalAmount + interestAmount + feeAmount;

        totalInterest += interestAmount;
        totalFees += feeAmount;
        totalInterestPaid += interestAmount;
        totalFeesPaid += feeAmount;

        schedule.push({
          periodNumber: i,
          dueDate: dueDateStr(i),
          beginningBalance: beginningBalance,
          principalAmount: principalAmount,
          interestAmount: interestAmount,
          feeAmount: feeAmount,
          totalAmount: totalAmount,
        });
      }
    } else {
      // future-proof: nếu thêm enum mới mà quên handle
      throw new UnprocessableEntityException(
        `Unsupported repaymentMethod "${repaymentMethod}"`,
      );
    }

    // 3) Totals - đã được làm tròn trong quá trình tính
    const totalRepayment = loanAmount + totalInterest + totalFees;

    // monthlyPayment:
    // - equal_installment: có thể dùng trung bình, hoặc dùng kỳ 1 (tuỳ UX)
    // - interest_only: trung bình sẽ "ảo" vì kỳ cuối to, nhưng vẫn ok để hiển thị thêm
    const monthlyPayment = Math.round(totalRepayment / durationMonths);

    return {
      loanAmount,
      durationMonths,
      productType: loanType.name,

      appliedInterestRate: interestRateMonthly,
      appliedMgmtFeeRateMonthly: totalFeeRate,

      totalCustodyFeeRate: totalFeeRate,

      totalInterest: totalInterest, // Đã được làm tròn trong loop
      totalFees: totalFees, // Đã được làm tròn trong loop
      totalRepayment: totalRepayment,
      monthlyPayment: monthlyPayment,

      schedule,
    };
  }
}
