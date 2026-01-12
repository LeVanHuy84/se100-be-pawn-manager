import { Prisma, PrismaClient } from '../../../generated/prisma';
import {
  PaymentType,
  PaymentMethod,
  PaymentComponent,
  RepaymentItemStatus,
} from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding Loan Payments...');

  // Lấy các loan đã ACTIVE
  const activeLoans = await prisma.loan.findMany({
    where: {
      status: {
        in: ['ACTIVE', 'OVERDUE'],
      },
    },
    include: {
      repaymentSchedule: {
        orderBy: {
          periodNumber: 'asc',
        },
      },
    },
  });

  if (activeLoans.length === 0) {
    console.error(
      '❌ Lỗi: Không có loan nào để tạo payment. Chạy seed loan trước!',
    );
    return;
  }

  console.log(`Found ${activeLoans.length} active/overdue loans`);

  // === Payment 1: Thanh toán định kỳ kỳ 1 cho Loan 1 ===
  const loan1 = activeLoans.find((l) => l.loanCode === 'LN-2026-000001');
  if (loan1 && loan1.repaymentSchedule.length > 0) {
    const period1 = loan1.repaymentSchedule[0]; // Kỳ 1

    // Tạo payment
    const payment1 = await prisma.loanPayment.create({
      data: {
        loanId: loan1.id,
        amount: period1.totalAmount,
        paymentType: PaymentType.PERIODIC,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date('2026-02-01'),
        referenceCode: 'PAY-2026-0001',
        recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      },
    });

    // Tạo payment allocations
    await prisma.paymentAllocation.createMany({
      data: [
        {
          paymentId: payment1.id,
          componentType: PaymentComponent.PRINCIPAL,
          amount: period1.principalAmount,
          note: 'Principal payment for period 1',
        },
        {
          paymentId: payment1.id,
          componentType: PaymentComponent.INTEREST,
          amount: period1.interestAmount,
          note: 'Interest payment for period 1',
        },
        {
          paymentId: payment1.id,
          componentType: PaymentComponent.SERVICE_FEE,
          amount: period1.feeAmount,
          note: 'Service fee for period 1',
        },
      ],
    });

    // Cập nhật repayment schedule
    await prisma.repaymentScheduleDetail.update({
      where: { id: period1.id },
      data: {
        status: RepaymentItemStatus.PAID,
        paidPrincipal: period1.principalAmount,
        paidInterest: period1.interestAmount,
        paidFee: period1.feeAmount,
        paidAt: new Date('2026-02-01'),
      },
    });

    // Cập nhật remaining amount của loan
    await prisma.loan.update({
      where: { id: loan1.id },
      data: {
        remainingAmount:
          loan1.remainingAmount.toNumber() - period1.totalAmount.toNumber(),
      },
    });

    console.log(
      `✅ Created Payment: ${payment1.referenceCode} for ${loan1.loanCode}`,
    );
  }

  // === Payment 2: Thanh toán trả trước một phần (Early Payment) cho Loan 1 ===
  if (loan1) {
    const earlyPaymentAmount = 5000000; // 5 triệu trả trước

    const payment2 = await prisma.loanPayment.create({
      data: {
        loanId: loan1.id,
        amount: earlyPaymentAmount,
        paymentType: PaymentType.EARLY,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paidAt: new Date('2026-02-15'),
        referenceCode: 'PAY-2026-0002',
        recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      },
    });

    // Phân bổ: Ưu tiên trả gốc
    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment2.id,
        componentType: PaymentComponent.PRINCIPAL,
        amount: earlyPaymentAmount,
        note: 'Early principal payment',
      },
    });

    // Cập nhật remaining amount
    await prisma.loan.update({
      where: { id: loan1.id },
      data: {
        remainingAmount: loan1.remainingAmount.toNumber() - earlyPaymentAmount,
      },
    });

    console.log(
      `✅ Created Early Payment: ${payment2.referenceCode} for ${loan1.loanCode}`,
    );
  }

  // === Payment 3: Thanh toán kỳ 1 cho Loan 4 (đúng hạn) ===
  const loan4 = activeLoans.find((l) => l.loanCode === 'LN-2026-000004');
  if (loan4 && loan4.repaymentSchedule.length > 0) {
    const period1 = loan4.repaymentSchedule[0];

    const payment3 = await prisma.loanPayment.create({
      data: {
        loanId: loan4.id,
        amount: period1.totalAmount,
        paymentType: PaymentType.PERIODIC,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date('2025-11-01'),
        referenceCode: 'PAY-2025-0101',
        recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      },
    });

    await prisma.paymentAllocation.createMany({
      data: [
        {
          paymentId: payment3.id,
          componentType: PaymentComponent.PRINCIPAL,
          amount: period1.principalAmount,
        },
        {
          paymentId: payment3.id,
          componentType: PaymentComponent.INTEREST,
          amount: period1.interestAmount,
        },
        {
          paymentId: payment3.id,
          componentType: PaymentComponent.SERVICE_FEE,
          amount: period1.feeAmount,
        },
      ],
    });

    await prisma.repaymentScheduleDetail.update({
      where: { id: period1.id },
      data: {
        status: RepaymentItemStatus.PAID,
        paidPrincipal: period1.principalAmount,
        paidInterest: period1.interestAmount,
        paidFee: period1.feeAmount,
        paidAt: new Date('2025-11-01'),
      },
    });

    console.log(
      `✅ Created Payment: ${payment3.referenceCode} for ${loan4.loanCode}`,
    );
  }

  // === Payment 4: Thanh toán một phần kỳ 2 cho Loan 4 (trả thiếu) ===
  if (loan4 && loan4.repaymentSchedule.length > 1) {
    const period2 = loan4.repaymentSchedule[1];
    const partialAmount = period2.totalAmount.toNumber() * 0.5; // Trả 50%

    const payment4 = await prisma.loanPayment.create({
      data: {
        loanId: loan4.id,
        amount: partialAmount,
        paymentType: PaymentType.PERIODIC,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date('2025-12-05'),
        referenceCode: 'PAY-2025-0102',
        recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      },
    });

    // Phân bổ theo thứ tự: Lãi -> Phí -> Gốc
    const paidInterest = Math.min(
      partialAmount,
      period2.interestAmount.toNumber(),
    );
    const remainingAfterInterest = partialAmount - paidInterest;
    const paidFee = Math.min(
      remainingAfterInterest,
      period2.feeAmount.toNumber(),
    );
    const remainingAfterFee = remainingAfterInterest - paidFee;
    const paidPrincipal = Math.min(
      remainingAfterFee,
      period2.principalAmount.toNumber(),
    );
    const allocations: Prisma.PaymentAllocationCreateManyInput[] = [];
    if (paidInterest > 0) {
      allocations.push({
        paymentId: payment4.id,
        componentType: PaymentComponent.INTEREST,
        amount: paidInterest,
      });
    }
    if (paidFee > 0) {
      allocations.push({
        paymentId: payment4.id,
        componentType: PaymentComponent.SERVICE_FEE,
        amount: paidFee,
      });
    }
    if (paidPrincipal > 0) {
      allocations.push({
        paymentId: payment4.id,
        componentType: PaymentComponent.PRINCIPAL,
        amount: paidPrincipal,
      });
    }

    await prisma.paymentAllocation.createMany({ data: allocations });

    // Cập nhật repayment schedule (vẫn còn nợ)
    await prisma.repaymentScheduleDetail.update({
      where: { id: period2.id },
      data: {
        paidPrincipal: paidPrincipal,
        paidInterest: paidInterest,
        paidFee: paidFee,
        status: RepaymentItemStatus.OVERDUE, // Vẫn overdue vì trả chưa đủ
      },
    });

    console.log(
      `✅ Created Partial Payment: ${payment4.referenceCode} for ${loan4.loanCode} (50% of period 2)`,
    );
  }

  // === Payment 5: Thanh toán phí phạt cho Loan 4 kỳ 2 ===
  if (loan4 && loan4.repaymentSchedule.length > 1) {
    const period2 = loan4.repaymentSchedule[1];

    if (period2.penaltyAmount.toNumber() > 0) {
      const payment5 = await prisma.loanPayment.create({
        data: {
          loanId: loan4.id,
          amount: period2.penaltyAmount,
          paymentType: PaymentType.ADJUSTMENT,
          paymentMethod: PaymentMethod.CASH,
          paidAt: new Date('2026-01-10'),
          referenceCode: 'PAY-2026-0003',
          recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
        },
      });

      await prisma.paymentAllocation.create({
        data: {
          paymentId: payment5.id,
          componentType: PaymentComponent.PENALTY,
          amount: period2.penaltyAmount,
          note: 'Late payment penalty',
        },
      });

      // Cập nhật penalty đã trả
      await prisma.repaymentScheduleDetail.update({
        where: { id: period2.id },
        data: {
          paidPenalty: period2.penaltyAmount,
        },
      });

      console.log(
        `✅ Created Penalty Payment: ${payment5.referenceCode} for ${loan4.loanCode}`,
      );
    }
  }

  // === Payment 6: Tất toán sớm (Payoff) - Ví dụ cho Loan 2 ===
  const loan2 = activeLoans.find((l) => l.loanCode === 'LN-2026-000002');
  if (loan2) {
    // Tính tổng số tiền cần tất toán
    const remainingSchedules = await prisma.repaymentScheduleDetail.findMany({
      where: {
        loanId: loan2.id,
        status: RepaymentItemStatus.PENDING,
      },
    });

    if (remainingSchedules.length > 0) {
      const totalPayoffAmount = remainingSchedules.reduce(
        (sum, item) => sum + parseFloat(item.totalAmount.toString()),
        0,
      );

      const payment6 = await prisma.loanPayment.create({
        data: {
          loanId: loan2.id,
          amount: totalPayoffAmount,
          paymentType: PaymentType.PAYOFF,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paidAt: new Date('2026-01-20'),
          referenceCode: 'PAY-2026-0004',
          recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
        },
      });

      // Tính tổng từng component
      const totalPrincipal = remainingSchedules.reduce(
        (sum, item) => sum + parseFloat(item.principalAmount.toString()),
        0,
      );
      const totalInterest = remainingSchedules.reduce(
        (sum, item) => sum + parseFloat(item.interestAmount.toString()),
        0,
      );
      const totalFee = remainingSchedules.reduce(
        (sum, item) => sum + parseFloat(item.feeAmount.toString()),
        0,
      );

      await prisma.paymentAllocation.createMany({
        data: [
          {
            paymentId: payment6.id,
            componentType: PaymentComponent.PRINCIPAL,
            amount: totalPrincipal,
            note: 'Payoff - Principal',
          },
          {
            paymentId: payment6.id,
            componentType: PaymentComponent.INTEREST,
            amount: totalInterest,
            note: 'Payoff - Interest',
          },
          ...(totalFee > 0
            ? [
                {
                  paymentId: payment6.id,
                  componentType: PaymentComponent.SERVICE_FEE,
                  amount: totalFee,
                  note: 'Payoff - Fees',
                },
              ]
            : []),
        ],
      });

      // Cập nhật tất cả các kỳ còn lại thành PAID
      for (const schedule of remainingSchedules) {
        await prisma.repaymentScheduleDetail.update({
          where: { id: schedule.id },
          data: {
            status: RepaymentItemStatus.PAID,
            paidPrincipal: schedule.principalAmount,
            paidInterest: schedule.interestAmount,
            paidFee: schedule.feeAmount,
            paidAt: new Date('2026-01-20'),
          },
        });
      }

      // Cập nhật loan status thành CLOSED
      await prisma.loan.update({
        where: { id: loan2.id },
        data: {
          status: 'CLOSED',
          remainingAmount: 0,
        },
      });

      console.log(
        `✅ Created Payoff Payment: ${payment6.referenceCode} for ${loan2.loanCode} - Loan CLOSED`,
      );
    }
  }

  console.log('✅ Payment seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
