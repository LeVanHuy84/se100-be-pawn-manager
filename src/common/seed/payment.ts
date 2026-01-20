import { Prisma, PrismaClient } from '../../../generated/prisma';
import {
  PaymentType,
  PaymentMethod,
  PaymentComponent,
  RepaymentItemStatus,
  RevenueType,
} from '../../../generated/prisma';

const prisma = new PrismaClient();

/**
 * Auto-generate payment reference code
 * Format: PAY-YYYY-NNNNNN
 */
async function generatePaymentReferenceCode(): Promise<string> {
  const year = new Date().getFullYear();
  const sequence = await prisma.paymentSequence.upsert({
    where: { year },
    create: { year, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `PAY-${year}-${sequence.value.toString().padStart(6, '0')}`;
}

async function main() {
  console.log('🌱 Start seeding Loan Payments...');

  // Xóa dữ liệu cũ để tránh duplicate
  console.log('Cleaning old payment data...');
  await prisma.revenueLedger.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.loanPayment.deleteMany({});
  console.log('Old payment data cleaned.');

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
    const referenceCode1 = await generatePaymentReferenceCode();
    const payment1 = await prisma.loanPayment.create({
      data: {
        loanId: loan1.id,
        storeId: loan1.storeId,
        amount: period1.totalAmount,
        paymentType: PaymentType.PERIODIC,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date('2026-02-01'),
        referenceCode: referenceCode1,
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

    // Tạo RevenueLedger cho lãi và phí
    await prisma.revenueLedger.createMany({
      data: [
        {
          type: RevenueType.INTEREST,
          amount: period1.interestAmount,
          refId: payment1.id,
          storeId: loan1.storeId,
          recordedAt: new Date('2026-02-01'),
        },
        {
          type: RevenueType.SERVICE_FEE,
          amount: period1.feeAmount,
          refId: payment1.id,
          storeId: loan1.storeId,
          recordedAt: new Date('2026-02-01'),
        },
      ],
    });

    console.log(
      `✅ Created Payment: ${payment1.referenceCode} for ${loan1.loanCode}`,
    );
  }

  // === Payment 2: Thanh toán trả trước một phần (Early Payment) cho Loan 1 ===
  if (loan1) {
    const earlyPaymentAmount = 5000000; // 5 triệu trả trước

    const referenceCode2 = await generatePaymentReferenceCode();
    const payment2 = await prisma.loanPayment.create({
      data: {
        loanId: loan1.id,
        storeId: loan1.storeId,
        amount: earlyPaymentAmount,
        paymentType: PaymentType.EARLY,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paidAt: new Date('2026-02-15'),
        referenceCode: referenceCode2,
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

    const referenceCode3 = await generatePaymentReferenceCode();
    const payment3 = await prisma.loanPayment.create({
      data: {
        loanId: loan4.id,
        storeId: loan4.storeId,
        amount: period1.totalAmount,
        paymentType: PaymentType.PERIODIC,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date('2025-11-01'),
        referenceCode: referenceCode3,
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

    // Tạo RevenueLedger cho lãi và phí
    await prisma.revenueLedger.createMany({
      data: [
        {
          type: RevenueType.INTEREST,
          amount: period1.interestAmount,
          refId: payment3.id,
          storeId: loan4.storeId,
          recordedAt: new Date('2025-11-01'),
        },
        {
          type: RevenueType.SERVICE_FEE,
          amount: period1.feeAmount,
          refId: payment3.id,
          storeId: loan4.storeId,
          recordedAt: new Date('2025-11-01'),
        },
      ],
    });

    console.log(
      `✅ Created Payment: ${payment3.referenceCode} for ${loan4.loanCode}`,
    );
  }

  // === Payment 4: Thanh toán một phần kỳ 2 cho Loan 4 (trả thiếu) ===
  if (loan4 && loan4.repaymentSchedule.length > 1) {
    const period2 = loan4.repaymentSchedule[1];
    const partialAmount = period2.totalAmount.toNumber() * 0.5; // Trả 50%

    const referenceCode4 = await generatePaymentReferenceCode();
    const payment4 = await prisma.loanPayment.create({
      data: {
        loanId: loan4.id,
        storeId: loan4.storeId,
        amount: partialAmount,
        paymentType: PaymentType.PERIODIC,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date('2025-12-05'),
        referenceCode: referenceCode4,
        recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      },
    });

    // Phân bổ theo thứ tự: Lãi -> Phí -> Gốc (làm tròn lên)
    const paidInterest = Math.ceil(
      Math.min(partialAmount, period2.interestAmount.toNumber()),
    );
    const remainingAfterInterest = partialAmount - paidInterest;
    const paidFee = Math.ceil(
      Math.min(remainingAfterInterest, period2.feeAmount.toNumber()),
    );
    const remainingAfterFee = remainingAfterInterest - paidFee;
    const paidPrincipal = Math.ceil(
      Math.min(remainingAfterFee, period2.principalAmount.toNumber()),
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

    // Tính penalty cho kỳ overdue (đồng bộ với loan seed)
    const latePaymentPenaltyRateParam = await prisma.systemParameter.findFirst({
      where: { paramKey: 'PENALTY_INTEREST_RATE' },
    });
    const latePaymentPenaltyRate = latePaymentPenaltyRateParam
      ? parseFloat(latePaymentPenaltyRateParam.paramValue)
      : 0.005;

    const daysOverdue = Math.floor(
      (new Date('2025-12-05').getTime() - period2.dueDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const penaltyAmount =
      daysOverdue > 0
        ? Math.ceil(
            period2.beginningBalance.toNumber() *
              latePaymentPenaltyRate *
              (daysOverdue / 30),
          )
        : 0;

    // Cập nhật repayment schedule (vẫn còn nợ) với penalty
    await prisma.repaymentScheduleDetail.update({
      where: { id: period2.id },
      data: {
        paidPrincipal: paidPrincipal,
        paidInterest: paidInterest,
        paidFee: paidFee,
        status: RepaymentItemStatus.OVERDUE, // Vẫn overdue vì trả chưa đủ
        penaltyAmount: penaltyAmount, // Thêm penalty cho đồng bộ
        totalAmount: {
          increment: penaltyAmount, // Cộng thêm penalty vào total
        },
        lastPenaltyAppliedAt: penaltyAmount > 0 ? new Date('2025-12-05') : null,
      },
    });

    // Tạo RevenueLedger cho lãi và phí đã thanh toán
    const revenueEntries: Prisma.RevenueLedgerCreateManyInput[] = [];
    if (paidInterest > 0) {
      revenueEntries.push({
        type: RevenueType.INTEREST,
        amount: paidInterest,
        refId: payment4.id,
        storeId: loan4.storeId,
        recordedAt: new Date('2025-12-05'),
      });
    }
    if (paidFee > 0) {
      revenueEntries.push({
        type: RevenueType.SERVICE_FEE,
        amount: paidFee,
        refId: payment4.id,
        storeId: loan4.storeId,
        recordedAt: new Date('2025-12-05'),
      });
    }
    if (revenueEntries.length > 0) {
      await prisma.revenueLedger.createMany({ data: revenueEntries });
    }

    console.log(
      `✅ Created Partial Payment: ${payment4.referenceCode} for ${loan4.loanCode} (50% of period 2)`,
    );
  }

  // === Payment 5: Thanh toán phí phạt cho Loan 4 kỳ 2 ===
  if (loan4 && loan4.repaymentSchedule.length > 1) {
    // Reload period2 từ DB để lấy penalty đã được update ở Payment 4
    const period2Updated = await prisma.repaymentScheduleDetail.findFirst({
      where: {
        loanId: loan4.id,
        periodNumber: 2,
      },
    });

    if (period2Updated && period2Updated.penaltyAmount.toNumber() > 0) {
      const referenceCode5 = await generatePaymentReferenceCode();
      const payment5 = await prisma.loanPayment.create({
        data: {
          loanId: loan4.id,
          storeId: loan4.storeId,
          amount: period2Updated.penaltyAmount,
          paymentType: PaymentType.ADJUSTMENT,
          paymentMethod: PaymentMethod.CASH,
          paidAt: new Date('2026-01-10'),
          referenceCode: referenceCode5,
          recorderEmployeeId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
        },
      });

      await prisma.paymentAllocation.create({
        data: {
          paymentId: payment5.id,
          componentType: PaymentComponent.LATE_FEE,
          amount: period2Updated.penaltyAmount,
          note: 'Late payment penalty',
        },
      });

      // Cập nhật penalty đã trả
      await prisma.repaymentScheduleDetail.update({
        where: { id: period2Updated.id },
        data: {
          paidPenalty: period2Updated.penaltyAmount,
        },
      });

      // Tạo RevenueLedger cho phí phạt
      await prisma.revenueLedger.create({
        data: {
          type: RevenueType.LATE_FEE,
          amount: period2Updated.penaltyAmount,
          refId: payment5.id,
          storeId: loan4.storeId,
          recordedAt: new Date('2026-01-10'),
        },
      });

      console.log(
        `✅ Created Penalty Payment: ${payment5.referenceCode} for ${loan4.loanCode} - Penalty: ${period2Updated.penaltyAmount.toNumber()}`,
      );
    } else {
      console.log(
        `⚠️ Skipped Penalty Payment for ${loan4.loanCode} - No penalty amount found`,
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

      const referenceCode6 = await generatePaymentReferenceCode();
      const payment6 = await prisma.loanPayment.create({
        data: {
          loanId: loan2.id,
          storeId: loan2.storeId,
          amount: totalPayoffAmount,
          paymentType: PaymentType.PAYOFF,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paidAt: new Date('2026-01-20'),
          referenceCode: referenceCode6,
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

      // Tạo RevenueLedger cho lãi và phí tất toán
      const payoffRevenueEntries: Prisma.RevenueLedgerCreateManyInput[] = [];
      if (totalInterest > 0) {
        payoffRevenueEntries.push({
          type: RevenueType.INTEREST,
          amount: totalInterest,
          refId: payment6.id,
          storeId: loan2.storeId,
          recordedAt: new Date('2026-01-20'),
        });
      }
      if (totalFee > 0) {
        payoffRevenueEntries.push({
          type: RevenueType.SERVICE_FEE,
          amount: totalFee,
          refId: payment6.id,
          storeId: loan2.storeId,
          recordedAt: new Date('2026-01-20'),
        });
      }
      if (payoffRevenueEntries.length > 0) {
        await prisma.revenueLedger.createMany({ data: payoffRevenueEntries });
      }

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
