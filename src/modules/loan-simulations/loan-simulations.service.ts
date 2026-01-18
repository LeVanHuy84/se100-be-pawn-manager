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
      const principalPerMonth = loanAmount / durationMonths; // Keep raw for accuracy
      let remaining = loanAmount;
      let totalRoundedPrincipalPaid = 0; // Track rounded amounts for final adjustment

      for (let i = 1; i <= durationMonths; i++) {
        const beginningBalance = remaining;

        // Tính toán raw, chưa làm tròn
        const interestAmount = beginningBalance * (interestRateMonthly / 100);

        // Tính principal amount
        const principalAmount = principalPerMonth;

        // Fee is fixed per month (pawn shop model)
        const feeAmount = i === 1 ? monthlyFeeFixed : 0;

        // Chỉ làm tròn ở bước cuối cùng (khi lưu vào schedule)
        let roundedPrincipal = Math.ceil(principalAmount);

        // Kỳ cuối: điều chỉnh để tổng các kỳ đã rounded = chính xác loan amount
        if (i === durationMonths) {
          roundedPrincipal = loanAmount - totalRoundedPrincipalPaid;
        }

        const roundedInterest = Math.ceil(interestAmount);
        const roundedFee = Math.ceil(feeAmount);
        const totalAmount = roundedPrincipal + roundedInterest + roundedFee;

        totalInterest += roundedInterest;
        totalFees += roundedFee;
        totalRoundedPrincipalPaid += roundedPrincipal; // Track rounded for adjustment
        remaining = beginningBalance - principalAmount; // Use raw for next iteration

        schedule.push({
          periodNumber: i,
          dueDate: dueDateStr(i),
          beginningBalance: Math.ceil(beginningBalance),
          principalAmount: roundedPrincipal,
          interestAmount: roundedInterest,
          feeAmount: roundedFee,
          totalAmount: totalAmount,
        });
      }
    } else if (repaymentMethod === RepaymentMethod.INTEREST_ONLY) {
      // mỗi tháng: interest + fee; tháng cuối: interest + fee + full principal
      let totalInterestPaid = 0;
      let totalFeesPaid = 0;

      for (let i = 1; i <= durationMonths; i++) {
        const beginningBalance = loanAmount; // giữ nguyên tới cuối kỳ

        // Tính toán chuẩn, chưa làm tròn
        let interestAmount = loanAmount * (interestRateMonthly / 100);
        let feeAmount = monthlyFeeFixed;

        // Kỳ cuối: điều chỉnh interest và fee nếu có sai lệch tích lũy
        if (i === durationMonths) {
          const expectedTotalInterest =
            loanAmount * (interestRateMonthly / 100) * durationMonths;
          const expectedTotalFees = monthlyFeeFixed * durationMonths;

          interestAmount = expectedTotalInterest - totalInterestPaid;
          feeAmount = expectedTotalFees - totalFeesPaid;
        }

        const principalAmount = i === durationMonths ? loanAmount : 0;

        // Chỉ làm tròn ở bước cuối cùng
        const roundedPrincipal = Math.ceil(principalAmount);
        const roundedInterest = Math.ceil(interestAmount);
        const roundedFee = Math.ceil(feeAmount);
        const totalAmount = roundedPrincipal + roundedInterest + roundedFee;

        totalInterest += roundedInterest;
        totalFees += roundedFee;
        totalInterestPaid += interestAmount; // raw for tracking
        totalFeesPaid += feeAmount; // raw for tracking

        schedule.push({
          periodNumber: i,
          dueDate: dueDateStr(i),
          beginningBalance: Math.ceil(beginningBalance),
          principalAmount: roundedPrincipal,
          interestAmount: roundedInterest,
          feeAmount: roundedFee,
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
    const totalRepayment = Math.ceil(loanAmount + totalInterest + totalFees);

    // monthlyPayment:
    // - equal_installment: có thể dùng trung bình, hoặc dùng kỳ 1 (tuỳ UX)
    // - interest_only: trung bình sẽ "ảo" vì kỳ cuối to, nhưng vẫn ok để hiển thị thêm
    const monthlyPayment = Math.ceil(totalRepayment / durationMonths);

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
