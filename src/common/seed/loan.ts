import { PrismaClient } from '../../../generated/prisma';
import {
  LoanStatus,
  RepaymentMethod,
  RepaymentItemStatus,
} from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding Loans...');

  // Xóa dữ liệu cũ để tránh duplicate - theo đúng thứ tự foreign key
  console.log('Cleaning old loan data...');
  await prisma.notificationLog.deleteMany({});
  await prisma.disbursement.deleteMany({});
  await prisma.revenueLedger.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.loanPayment.deleteMany({});
  await prisma.repaymentScheduleDetail.deleteMany({});
  await prisma.collateral.updateMany({
    where: { loanId: { not: null } },
    data: { loanId: null, status: 'STORED' },
  });
  await prisma.loan.deleteMany({});
  console.log('Old loan data cleaned.');

  // Lấy dữ liệu cần thiết
  const customers = await prisma.customer.findMany();
  const loanTypes = await prisma.loanType.findMany();
  const stores = await prisma.store.findMany();
  const collaterals = await prisma.collateral.findMany({
    where: {
      status: 'STORED', // Chỉ lấy tài sản đã được lưu kho và chưa gắn với loan nào
      loanId: null,
    },
  });

  if (customers.length === 0 || loanTypes.length === 0 || stores.length === 0) {
    console.error(
      '❌ Lỗi: Cần chạy seed cho Customer, LoanType, và Store trước!',
    );
    return;
  }

  console.log(`Found ${customers.length} customers`);
  console.log(`Found ${loanTypes.length} loan types`);
  console.log(`Found ${stores.length} stores`);
  console.log(`Found ${collaterals.length} available collaterals`);

  // Helper functions
  const findCustomer = (nationalId: string) =>
    customers.find((c) => c.nationalId === nationalId);

  const findLoanType = (name: string) =>
    loanTypes.find((lt) => lt.name.includes(name));

  const findStore = (name: string) => stores.find((s) => s.name.includes(name));

  // Lấy tham số hệ thống
  const latePaymentPenaltyRateParam = await prisma.systemParameter.findFirst({
    where: { paramKey: 'PENALTY_INTEREST_RATE' },
  });
  const latePaymentPenaltyRate = latePaymentPenaltyRateParam
    ? parseFloat(latePaymentPenaltyRateParam.paramValue)
    : 0.05;

  // === Loan 1: ACTIVE - Trả góp đều (Equal Installment) ===
  const loan1Customer = findCustomer('079090001234'); // Nguyen Van A
  const loan1Type = findLoanType('VEHICLE_BIKE_STANDARD_12M');
  const loan1Store = findStore('Hội Sở Chính');

  if (loan1Customer && loan1Type && loan1Store) {
    const loanAmount = 30000000; // 30 triệu
    const durationMonths = loan1Type.durationMonths;
    const monthlyInterestRate = loan1Type.interestRateMonthly.toNumber() / 100;

    // Tính toán sơ bộ để tạo loan record
    // Sẽ được tính chính xác trong loop schedule
    const estimatedMonthlyInterest = loanAmount * monthlyInterestRate;
    const estimatedMonthlyPrincipal = loanAmount / durationMonths;
    const totalFees = Math.ceil(loanAmount * 0.02); // Management fee 2%

    // Tạo loan record với estimates (sẽ update sau)
    const loan1 = await prisma.loan.create({
      data: {
        loanCode: 'LN-2026-000001',
        customerId: loan1Customer.id,
        loanAmount: loanAmount,
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        loanTypeId: loan1Type.id,
        durationMonths: durationMonths,
        appliedInterestRate: loan1Type.interestRateMonthly,
        latePaymentPenaltyRate: latePaymentPenaltyRate,
        totalInterest: 0, // Will calculate in schedule loop
        totalFees: totalFees,
        totalRepayment: 0, // Will calculate after schedule
        monthlyPayment: Math.ceil(
          estimatedMonthlyPrincipal + estimatedMonthlyInterest,
        ),
        startDate: new Date('2026-01-01'),
        status: LoanStatus.ACTIVE,
        approvedAt: new Date('2025-12-28'),
        approvedBy: 'user_admin123',
        activatedAt: new Date('2026-01-01'),
        remainingAmount: 0, // Will calculate after schedule
        storeId: loan1Store.id,
        createdBy: 'user_admin123',
        notes: 'Loan for motorbike purchase - Equal installment',
      },
    });

    console.log(`✅ Created Loan: ${loan1.loanCode}`);

    // Gắn collateral vào loan nếu có
    if (collaterals.length > 0) {
      await prisma.collateral.update({
        where: { id: collaterals[0].id },
        data: {
          loanId: loan1.id,
          status: 'PLEDGED',
        },
      });
      console.log(`  ↳ Attached collateral to ${loan1.loanCode}`);
    }

    // Tạo Repayment Schedule cho Loan 1
    const startDate = new Date('2026-01-01');
    let beginningBalance = loanAmount;
    let totalRoundedPrincipal = 0; // Track để điều chỉnh kỳ cuối
    let totalInterest = 0; // Track actual total interest
    let period1Total = 0; // Track kỳ 1 đã trả để tính remaining

    for (let i = 1; i <= durationMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestAmount = beginningBalance * monthlyInterestRate;
      const principalAmount = loanAmount / durationMonths; // Use raw
      const feeAmount = i === 1 ? totalFees : 0; // Fee chỉ tính ở kỳ đầu

      // Round individual amounts
      let roundedPrincipal = Math.ceil(principalAmount);

      // Kỳ cuối: điều chỉnh để tổng chính xác
      if (i === durationMonths) {
        roundedPrincipal = loanAmount - totalRoundedPrincipal;
      }

      const roundedInterest = Math.ceil(interestAmount);
      const roundedFee = Math.ceil(feeAmount);
      const totalAmount = roundedPrincipal + roundedInterest + roundedFee;

      await prisma.repaymentScheduleDetail.create({
        data: {
          loanId: loan1.id,
          periodNumber: i,
          dueDate: dueDate,
          beginningBalance: beginningBalance,
          principalAmount: roundedPrincipal,
          interestAmount: roundedInterest,
          feeAmount: roundedFee,
          penaltyAmount: 0,
          totalAmount: totalAmount,
          status:
            i === 1 ? RepaymentItemStatus.PAID : RepaymentItemStatus.PENDING, // Kỳ 1 đã trả
          paidPrincipal: i === 1 ? roundedPrincipal : 0,
          paidInterest: i === 1 ? roundedInterest : 0,
          paidFee: i === 1 ? roundedFee : 0,
          paidPenalty: 0,
          paidAt: i === 1 ? new Date('2026-02-01') : null,
        },
      });

      totalRoundedPrincipal += roundedPrincipal;
      totalInterest += roundedInterest;
      if (i === 1) period1Total = totalAmount;
      beginningBalance -= principalAmount; // Use raw for next iteration
    }

    // Update loan with actual calculated values
    const totalRepayment = loanAmount + totalInterest + totalFees;
    const remainingAmount = totalRepayment - period1Total; // Đã trả kỳ 1
    await prisma.loan.update({
      where: { id: loan1.id },
      data: {
        totalInterest,
        totalRepayment,
        remainingAmount,
      },
    });

    console.log(
      `  ↳ Created ${durationMonths} repayment schedule items for ${loan1.loanCode}`,
    );
  }

  // === Loan 2: ACTIVE - Trả lãi trước (Interest Only) ===
  const loan2Customer = findCustomer('079090001235'); // Tran Thi B
  const loan2Type = findLoanType('GOLD_STANDARD_6M');
  const loan2Store = findStore('Nguyễn Trãi');

  if (loan2Customer && loan2Type && loan2Store) {
    const loanAmount = 50000000; // 50 triệu
    const durationMonths = loan2Type.durationMonths;
    const monthlyInterestRate = loan2Type.interestRateMonthly.toNumber() / 100;

    // Tính toán cho phương thức trả lãi trước
    const monthlyInterest = Math.ceil(loanAmount * monthlyInterestRate);
    const totalInterest = Math.ceil(monthlyInterest * durationMonths);
    const totalFees = Math.ceil(loanAmount * 0.02); // Management fee 2%
    const totalRepayment = Math.ceil(loanAmount + totalInterest + totalFees);

    const loan2 = await prisma.loan.create({
      data: {
        loanCode: 'LN-2026-0002',
        customerId: loan2Customer.id,
        loanAmount: loanAmount,
        repaymentMethod: RepaymentMethod.INTEREST_ONLY,
        loanTypeId: loan2Type.id,
        durationMonths: durationMonths,
        appliedInterestRate: loan2Type.interestRateMonthly,
        latePaymentPenaltyRate: latePaymentPenaltyRate,
        totalInterest: totalInterest,
        totalFees: totalFees,
        totalRepayment: totalRepayment,
        monthlyPayment: monthlyInterest,
        startDate: new Date('2026-01-05'),
        status: LoanStatus.ACTIVE,
        approvedAt: new Date('2026-01-02'),
        approvedBy: 'user_admin123',
        activatedAt: new Date('2026-01-05'),
        remainingAmount: totalRepayment,
        storeId: loan2Store.id,
        createdBy: 'user_admin123',
        notes: 'Gold collateral loan - Interest only payment',
      },
    });

    console.log(`✅ Created Loan: ${loan2.loanCode}`);

    // Gắn collateral vào loan nếu có
    if (collaterals.length > 1) {
      await prisma.collateral.update({
        where: { id: collaterals[1].id },
        data: {
          loanId: loan2.id,
          status: 'PLEDGED',
        },
      });
      console.log(`  ↳ Attached collateral to ${loan2.loanCode}`);
    }

    // Tạo Repayment Schedule cho Loan 2 (Interest Only)
    const startDate = new Date('2026-01-05');

    for (let i = 1; i <= durationMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const isLastPeriod = i === durationMonths;
      const principalAmount = isLastPeriod ? loanAmount : 0; // Gốc chỉ trả ở kỳ cuối
      const interestAmount = Math.ceil(monthlyInterest);
      const feeAmount = i === 1 ? Math.ceil(totalFees) : 0;
      const totalAmount = Math.ceil(
        principalAmount + interestAmount + feeAmount,
      );

      await prisma.repaymentScheduleDetail.create({
        data: {
          loanId: loan2.id,
          periodNumber: i,
          dueDate: dueDate,
          beginningBalance: loanAmount,
          principalAmount: principalAmount,
          interestAmount: interestAmount,
          feeAmount: feeAmount,
          penaltyAmount: 0,
          totalAmount: totalAmount,
          status: RepaymentItemStatus.PENDING,
          paidPrincipal: 0,
          paidInterest: 0,
          paidFee: 0,
          paidPenalty: 0,
        },
      });
    }

    console.log(
      `  ↳ Created ${durationMonths} repayment schedule items for ${loan2.loanCode}`,
    );
  }

  // === Loan 3: PENDING - Chưa duyệt ===
  const loan3Customer = findCustomer('079090001236'); // Le Thi C
  const loan3Type = findLoanType('ELECTRONICS_PHONE_3M');
  const loan3Store = findStore('Nguyễn Trãi');

  if (loan3Customer && loan3Type && loan3Store) {
    const loanAmount = 8000000; // 8 triệu
    const durationMonths = loan3Type.durationMonths;
    const monthlyInterestRate = loan3Type.interestRateMonthly.toNumber() / 100;

    const monthlyInterest = loanAmount * monthlyInterestRate;
    const monthlyPrincipal = loanAmount / durationMonths;
    const monthlyPayment = monthlyPrincipal + monthlyInterest;
    const totalInterest = monthlyInterest * durationMonths;
    const totalFees = loanAmount * 0.02;
    const totalRepayment = loanAmount + totalInterest + totalFees;

    await prisma.loan.create({
      data: {
        loanCode: 'LN-2026-000003',
        customerId: loan3Customer.id,
        loanAmount: loanAmount,
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        loanTypeId: loan3Type.id,
        durationMonths: durationMonths,
        appliedInterestRate: loan3Type.interestRateMonthly,
        latePaymentPenaltyRate: latePaymentPenaltyRate,
        totalInterest: totalInterest,
        totalFees: totalFees,
        totalRepayment: totalRepayment,
        monthlyPayment: monthlyPayment,
        status: LoanStatus.PENDING,
        storeId: loan3Store.id,
        createdBy: 'user_staff456',
        notes: 'Phone collateral loan - Pending approval',
      },
    });

    console.log(`✅ Created Loan: LN-2026-000003 (PENDING)`);
  }

  // === Loan 4: OVERDUE - Quá hạn ===
  const loan4Customer = findCustomer('079090001237'); // Pham Van D
  const loan4Type = findLoanType('VEHICLE_CAR_STANDARD_12M');
  const loan4Store = findStore('Hội Sở Chính');

  if (loan4Customer && loan4Type && loan4Store) {
    const loanAmount = 100000000; // 100 triệu
    const durationMonths = loan4Type.durationMonths;
    const monthlyInterestRate = loan4Type.interestRateMonthly.toNumber() / 100;

    const totalFees = Math.ceil(loanAmount * 0.02);
    const estimatedMonthlyInterest = loanAmount * monthlyInterestRate;
    const estimatedMonthlyPrincipal = loanAmount / durationMonths;

    const loan4 = await prisma.loan.create({
      data: {
        loanCode: 'LN-2026-000004',
        customerId: loan4Customer.id,
        loanAmount: loanAmount,
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        loanTypeId: loan4Type.id,
        durationMonths: durationMonths,
        appliedInterestRate: loan4Type.interestRateMonthly,
        latePaymentPenaltyRate: latePaymentPenaltyRate,
        totalInterest: 0, // Will calculate in loop
        totalFees: totalFees,
        totalRepayment: 0, // Will calculate after schedule
        monthlyPayment: Math.ceil(
          estimatedMonthlyPrincipal + estimatedMonthlyInterest,
        ),
        startDate: new Date('2025-10-01'),
        status: LoanStatus.OVERDUE,
        approvedAt: new Date('2025-09-25'),
        approvedBy: 'user_admin123',
        activatedAt: new Date('2025-10-01'),
        remainingAmount: 0, // Will calculate after schedule
        storeId: loan4Store.id,
        createdBy: 'user_admin123',
        notes: 'Car collateral loan - Currently overdue',
      },
    });

    console.log(`✅ Created Loan: ${loan4.loanCode} (OVERDUE)`);

    // Tạo Repayment Schedule cho Loan 4 với một số kỳ overdue
    const startDate = new Date('2025-10-01');
    let beginningBalance = loanAmount;
    let totalRoundedPrincipal = 0; // Track để điều chỉnh kỳ cuối
    let totalInterest = 0; // Track actual total interest
    let totalPenalty = 0; // Track total penalty
    let period1Total = 0; // Track kỳ 1 đã trả

    for (let i = 1; i <= durationMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestAmountRaw = beginningBalance * monthlyInterestRate;
      const principalAmountRaw = loanAmount / durationMonths; // Use raw
      const feeAmountRaw = i === 1 ? totalFees : 0;

      // Round amounts
      let roundedPrincipal = Math.ceil(principalAmountRaw);

      // Kỳ cuối: điều chỉnh để tổng chính xác
      if (i === durationMonths) {
        roundedPrincipal = loanAmount - totalRoundedPrincipal;
      }

      const roundedInterest = Math.ceil(interestAmountRaw);
      const roundedFee = Math.ceil(feeAmountRaw);

      // Tính penalty nếu quá hạn
      let penaltyAmount = 0;
      let status: RepaymentItemStatus = RepaymentItemStatus.PENDING;

      if (i === 1) {
        // Kỳ 1 đã trả đúng hạn
        status = RepaymentItemStatus.PAID;
      } else if (i === 2 || i === 3) {
        // Kỳ 2, 3 quá hạn
        status = RepaymentItemStatus.OVERDUE;
        const daysOverdue = Math.floor(
          (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysOverdue > 0) {
          penaltyAmount = Math.ceil(
            beginningBalance * latePaymentPenaltyRate * (daysOverdue / 30),
          );
        }
      }

      const totalAmount =
        roundedPrincipal + roundedInterest + roundedFee + penaltyAmount;

      await prisma.repaymentScheduleDetail.create({
        data: {
          loanId: loan4.id,
          periodNumber: i,
          dueDate: dueDate,
          beginningBalance: beginningBalance,
          principalAmount: roundedPrincipal,
          interestAmount: roundedInterest,
          feeAmount: roundedFee,
          penaltyAmount: penaltyAmount,
          totalAmount: totalAmount,
          status: status,
          paidPrincipal: i === 1 ? roundedPrincipal : 0,
          paidInterest: i === 1 ? roundedInterest : 0,
          paidFee: i === 1 ? roundedFee : 0,
          paidPenalty: 0,
          paidAt: i === 1 ? new Date('2025-11-01') : null,
          lastPenaltyAppliedAt: penaltyAmount > 0 ? new Date() : null,
        },
      });

      totalRoundedPrincipal += roundedPrincipal;
      totalInterest += roundedInterest;
      totalPenalty += penaltyAmount;
      if (i === 1) period1Total = totalAmount;
      beginningBalance -= principalAmountRaw; // Use raw for next iteration
    }

    // Update loan with actual calculated values
    const totalRepayment = loanAmount + totalInterest + totalFees;
    const remainingAmount = totalRepayment + totalPenalty - period1Total; // Bao gồm penalty
    await prisma.loan.update({
      where: { id: loan4.id },
      data: {
        totalInterest,
        totalRepayment,
        remainingAmount,
      },
    });

    console.log(
      `  ↳ Created ${durationMonths} repayment schedule items for ${loan4.loanCode}`,
    );
  }

  // === Loan 5: REJECTED - Bị từ chối ===
  const loan5Customer = findCustomer('079090001238'); // Hoang Thi E
  const loan5Type = findLoanType('VEHICLE_BIKE_STANDARD_12M');
  const loan5Store = findStore('Tân Bình');

  if (loan5Customer && loan5Type && loan5Store) {
    await prisma.loan.create({
      data: {
        loanCode: 'LN-2026-000005',
        customerId: loan5Customer.id,
        loanAmount: 25000000,
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        loanTypeId: loan5Type.id,
        durationMonths: loan5Type.durationMonths,
        appliedInterestRate: loan5Type.interestRateMonthly,
        latePaymentPenaltyRate: latePaymentPenaltyRate,
        totalInterest: 0,
        totalFees: 0,
        totalRepayment: 0,
        monthlyPayment: 0,
        status: LoanStatus.REJECTED,
        approvedAt: new Date('2026-01-10'),
        approvedBy: 'user_admin123',
        storeId: loan5Store.id,
        createdBy: 'user_staff456',
        notes: 'Rejected - Customer credit score too low',
      },
    });

    console.log(`✅ Created Loan: LN-2026-000005 (REJECTED)`);
  }

  // === Loan 6: CLOSED - Đã hoàn tất ===
  const loan6Customer = findCustomer('079090001239'); // Ngo Van F
  const loan6Type = findLoanType('ELECTRONICS_PHONE_3M');
  const loan6Store = findStore('Bình Thạnh');

  if (loan6Customer && loan6Type && loan6Store) {
    const loanAmount = 10000000;
    const durationMonths = loan6Type.durationMonths;
    const monthlyInterestRate = loan6Type.interestRateMonthly.toNumber() / 100;

    const monthlyInterest = loanAmount * monthlyInterestRate;
    const monthlyPrincipal = loanAmount / durationMonths;
    const monthlyPayment = monthlyPrincipal + monthlyInterest;
    const totalInterest = monthlyInterest * durationMonths;
    const totalFees = loanAmount * 0.02;
    const totalRepayment = loanAmount + totalInterest + totalFees;

    const loan6 = await prisma.loan.create({
      data: {
        loanCode: 'LN-2026-000006',
        customerId: loan6Customer.id,
        loanAmount: loanAmount,
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        loanTypeId: loan6Type.id,
        durationMonths: durationMonths,
        appliedInterestRate: loan6Type.interestRateMonthly,
        latePaymentPenaltyRate: latePaymentPenaltyRate,
        totalInterest: totalInterest,
        totalFees: totalFees,
        totalRepayment: totalRepayment,
        monthlyPayment: monthlyPayment,
        startDate: new Date('2025-10-01'),
        status: LoanStatus.CLOSED,
        approvedAt: new Date('2025-09-28'),
        approvedBy: 'user_admin123',
        activatedAt: new Date('2025-10-01'),
        remainingAmount: 0,
        storeId: loan6Store.id,
        createdBy: 'user_staff456',
        notes: 'Phone loan - Fully paid and closed',
      },
    });

    console.log(`✅ Created Loan: ${loan6.loanCode} (CLOSED)`);

    // Tạo Repayment Schedule cho Loan 6 (tất cả đã PAID)
    const startDate = new Date('2025-10-01');
    let beginningBalance = loanAmount;

    for (let i = 1; i <= durationMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestAmount = beginningBalance * monthlyInterestRate;
      const principalAmount = monthlyPrincipal;
      const feeAmount = i === 1 ? totalFees : 0;
      const totalAmount = principalAmount + interestAmount + feeAmount;

      await prisma.repaymentScheduleDetail.create({
        data: {
          loanId: loan6.id,
          periodNumber: i,
          dueDate: dueDate,
          beginningBalance: beginningBalance,
          principalAmount: principalAmount,
          interestAmount: interestAmount,
          feeAmount: feeAmount,
          penaltyAmount: 0,
          totalAmount: totalAmount,
          status: RepaymentItemStatus.PAID,
          paidPrincipal: principalAmount,
          paidInterest: interestAmount,
          paidFee: feeAmount,
          paidPenalty: 0,
          paidAt: dueDate,
        },
      });

      beginningBalance -= principalAmount;
    }

    console.log(
      `  ↳ Created ${durationMonths} repayment schedule items for ${loan6.loanCode} (All PAID)`,
    );
  }

  // === Loan 7: WRITTEN_OFF - Đã xóa nợ ===
  const loan7Customer = findCustomer('079090001240'); // Dang Thi G
  const loan7Type = findLoanType('VEHICLE_BIKE_STANDARD_12M');
  const loan7Store = findStore('Thủ Đức');

  if (loan7Customer && loan7Type && loan7Store) {
    const loanAmount = 20000000;
    const durationMonths = loan7Type.durationMonths;
    const monthlyInterestRate = loan7Type.interestRateMonthly.toNumber() / 100;

    const monthlyInterest = loanAmount * monthlyInterestRate;
    const monthlyPrincipal = loanAmount / durationMonths;
    const monthlyPayment = monthlyPrincipal + monthlyInterest;
    const totalInterest = monthlyInterest * durationMonths;
    const totalFees = loanAmount * 0.02;
    const totalRepayment = loanAmount + totalInterest + totalFees;

    const loan7 = await prisma.loan.create({
      data: {
        loanCode: 'LN-2026-000007',
        customerId: loan7Customer.id,
        loanAmount: loanAmount,
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        loanTypeId: loan7Type.id,
        durationMonths: durationMonths,
        appliedInterestRate: loan7Type.interestRateMonthly,
        latePaymentPenaltyRate: latePaymentPenaltyRate,
        totalInterest: totalInterest,
        totalFees: totalFees,
        totalRepayment: totalRepayment,
        monthlyPayment: monthlyPayment,
        startDate: new Date('2025-06-01'),
        status: LoanStatus.PENDING,
        approvedAt: new Date('2025-05-28'),
        approvedBy: 'user_admin123',
        activatedAt: new Date('2025-06-01'),
        remainingAmount: totalRepayment * 0.6, // Còn nợ 60%
        storeId: loan7Store.id,
        createdBy: 'user_staff456',
        notes: 'Written off - Customer unable to pay, collateral liquidated',
      },
    });

    console.log(`✅ Created Loan: ${loan7.loanCode} (WRITTEN_OFF)`);

    // Tạo Repayment Schedule cho Loan 7 (một số PAID, còn lại OVERDUE)
    const startDate = new Date('2025-06-01');
    let beginningBalance = loanAmount;

    for (let i = 1; i <= durationMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestAmount = beginningBalance * monthlyInterestRate;
      const principalAmount = monthlyPrincipal;
      const feeAmount = i === 1 ? totalFees : 0;
      const status =
        i <= 4 ? RepaymentItemStatus.PAID : RepaymentItemStatus.OVERDUE;
      const totalAmount = principalAmount + interestAmount + feeAmount;

      await prisma.repaymentScheduleDetail.create({
        data: {
          loanId: loan7.id,
          periodNumber: i,
          dueDate: dueDate,
          beginningBalance: beginningBalance,
          principalAmount: principalAmount,
          interestAmount: interestAmount,
          feeAmount: feeAmount,
          penaltyAmount: 0,
          totalAmount: totalAmount,
          status: status,
          paidPrincipal: i <= 4 ? principalAmount : 0,
          paidInterest: i <= 4 ? interestAmount : 0,
          paidFee: i <= 4 ? feeAmount : 0,
          paidPenalty: 0,
          paidAt: i <= 4 ? dueDate : null,
        },
      });

      beginningBalance -= principalAmount;
    }

    console.log(
      `  ↳ Created ${durationMonths} repayment schedule items for ${loan7.loanCode}`,
    );
  }

  // Kết thúc seeding lưu thêm Loan Sequence 2026, 7
  await prisma.loanSequence.upsert({
    where: { year: 2026 },
    update: { value: 7 },
    create: { year: 2026, value: 7 },
  });

  console.log('✅ Loan seeding completed with 7 diverse loans!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
