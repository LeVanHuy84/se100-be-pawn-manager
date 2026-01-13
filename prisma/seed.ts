import {
  PrismaClient,
  LoanStatus,
  PaymentMethod,
  PaymentType,
} from '../@generated/prisma';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting intelligent seeding process...');

  const dataPath = path.join(__dirname, 'seed-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // 1. Seed Stores
  console.log('🌱 Seeding Stores...');
  for (const store of data.stores) {
    const exists = await prisma.store.findFirst({
      where: { name: store.name },
    });
    if (!exists) {
      await prisma.store.create({ data: store });
    }
  }

  // 2. Seed LoanTypes
  console.log('🌱 Seeding LoanTypes...');
  for (const loanType of data.loanTypes) {
    const exists = await prisma.loanType.findUnique({
      where: { name: loanType.name },
    });
    if (!exists) {
      await prisma.loanType.create({ data: loanType });
    }
  }

  // 3. Seed CollateralTypes
  console.log('🌱 Seeding CollateralTypes...');
  for (const type of data.commonCollateralTypes) {
    const exists = await prisma.collateralType.findFirst({
      where: { name: type.name },
    });
    if (!exists) {
      await prisma.collateralType.create({ data: type });
    }
  }

  // 4. Seed SystemParameters
  if (data.systemParameters) {
    console.log('🌱 Seeding SystemParameters...');
    for (const param of data.systemParameters) {
      const exists = await prisma.systemParameter.findFirst({
        where: { paramGroup: param.paramGroup, paramKey: param.paramKey },
      });
      if (!exists) {
        await prisma.systemParameter.create({ data: param });
      }
    }
  }

  // 5. Seed Customers
  console.log('🌱 Seeding Customers...');
  for (const customer of data.customers) {
    const exists = await prisma.customer.findUnique({
      where: { nationalId: customer.nationalId },
    });
    if (!exists) {
      await prisma.customer.create({ data: customer });
    }
  }

  // 6. Seed Loans (Smart Creation)
  const loansCount = await prisma.loan.count();
  if (loansCount === 0) {
    console.log('🌱 Seeding Loans & Related Entities...');

    // Fetch dependencies
    const allCustomers = await prisma.customer.findMany();
    const allStores = await prisma.store.findMany();
    const allLoanTypes = await prisma.loanType.findMany();
    const allCollateralTypes = await prisma.collateralType.findMany();

    if (
      allCustomers.length > 0 &&
      allStores.length > 0 &&
      allLoanTypes.length > 0
    ) {
      // --- Scenario 1: Active Standard Loan for Customer 1 ---
      const customer1 = allCustomers[0];
      const store1 = allStores[0];
      const standardLoanType =
        allLoanTypes.find((l) => l.name === 'Standard Loan') || allLoanTypes[0];
      const electronicsType =
        allCollateralTypes.find((c) => c.name === 'Electronics') ||
        allCollateralTypes[0];

      await createLoanWithDetails(prisma, {
        loanCode: 'L-2024-001',
        customer: customer1,
        store: store1,
        loanType: standardLoanType,
        collateralType: electronicsType,
        loanAmount: 10000000,
        durationMonths: 1,
        status: 'ACTIVE',
      });

      // --- Scenario 2: Overdue Gold Loan for Customer 2 ---
      if (allCustomers.length > 1) {
        const customer2 = allCustomers[1];
        const goldLoanType =
          allLoanTypes.find((l) => l.name === 'Gold Loan') || allLoanTypes[0];
        const jewelryType =
          allCollateralTypes.find((c) => c.name === 'Jewelry') ||
          allCollateralTypes[0];

        await createLoanWithDetails(prisma, {
          loanCode: 'L-2024-002',
          customer: customer2,
          store: store1, // Both at store 1
          loanType: goldLoanType,
          collateralType: jewelryType,
          loanAmount: 50000000, // 50M
          durationMonths: 3,
          status: 'OVERDUE',
        });
      }

      // --- Scenario 3: Completed (Closed) Loan for Customer 3 ---
      if (allCustomers.length > 2) {
        const customer3 = allCustomers[2];
        const techLoanType =
          allLoanTypes.find((l) => l.name === 'Tech Loan') || allLoanTypes[0];
        const store2 = allStores[1] || store1;

        await createLoanWithDetails(prisma, {
          loanCode: 'L-2024-003',
          customer: customer3,
          store: store2,
          loanType: techLoanType,
          collateralType: electronicsType, // Assuming tech is electronics
          loanAmount: 15000000,
          durationMonths: 1,
          status: 'CLOSED',
        });
      }
    }
  } else {
    console.log('⏩ Loans already exist. Skipping loan seeding.');
  }

  console.log('✨ Seeding completed.');
}

// Helper to create a fully fleshed out loan
async function createLoanWithDetails(
  prisma: PrismaClient,
  params: {
    loanCode: string;
    customer: any;
    store: any;
    loanType: any;
    collateralType: any;
    loanAmount: number;
    durationMonths: number; // Simplified, using loanType duration usually
    status: LoanStatus;
  },
) {
  const {
    loanCode,
    customer,
    store,
    loanType,
    collateralType,
    loanAmount,
    status,
  } = params;
  const durationMonths = params.durationMonths || loanType.durationMonths;
  const interestRate = Number(loanType.interestRateMonthly); // e.g., 0.05

  const principal = loanAmount;
  const monthlyInterest = principal * interestRate;
  const totalInterest = monthlyInterest * durationMonths;
  const totalRepayment = principal + totalInterest;

  const startDate = new Date();
  // Adjust dates based on status to make it realistic
  if (status === 'OVERDUE') {
    startDate.setMonth(startDate.getMonth() - durationMonths - 1); // Started long ago
  } else if (status === 'CLOSED') {
    startDate.setMonth(startDate.getMonth() - durationMonths - 2); // Closed 2 months ago
  } else if (status === 'ACTIVE') {
    startDate.setDate(startDate.getDate() - 5); // Started 5 days ago
  }

  const dueDate = new Date(startDate);
  dueDate.setMonth(dueDate.getMonth() + durationMonths);

  // Create Loan
  const loan = await prisma.loan.create({
    data: {
      loanCode,
      customerId: customer.id,
      storeId: store.id,
      loanTypeId: loanType.id,
      loanAmount: principal,
      repaymentMethod: 'INTEREST_ONLY', // Default for now
      durationMonths: durationMonths,
      appliedInterestRate: interestRate,
      latePaymentPenaltyRate: 0.005, // 0.5% per day
      totalInterest: totalInterest,
      totalFees: 0,
      totalRepayment: totalRepayment,
      monthlyPayment: monthlyInterest,
      status: status,
      startDate: startDate,
      approvedAt: startDate,
      approvedBy: 'system-seed',
      activatedAt: startDate,
      remainingAmount: status === 'CLOSED' ? 0 : totalRepayment,
    },
  });

  console.log(`   > Created Loan ${loanCode} [${status}]`);

  // Create Collateral
  await prisma.collateral.create({
    data: {
      collateralTypeId: collateralType.id,
      ownerName: customer.fullName,
      collateralInfo: {
        description: `Seeded Item for ${loanCode}`,
        condition: 'Good',
      },
      status: status === 'CLOSED' ? 'RELEASED' : 'STORED',
      loanId: loan.id,
      storeId: store.id,
      receivedDate: startDate,
      appraisedValue: principal * 1.2, // 80% LTV roughly
      ltvRatio: 0.8, // 80%
      images: {},
    },
  });

  // Create Repayment Schedule (Simplified: 1 period for Interest Only end of term)
  // Actually for Interest Only often means interest monthly, principal at end.
  // Let's do simple: 1 period balloon or monthly.
  // If duration > 1, create multiple periods.
  for (let i = 1; i <= durationMonths; i++) {
    const pDate = new Date(startDate);
    pDate.setMonth(pDate.getMonth() + i);

    const isLast = i === durationMonths;
    const periodPrincipal = isLast ? principal : 0;
    const periodTotal = periodPrincipal + monthlyInterest;

    await prisma.repaymentScheduleDetail.create({
      data: {
        loanId: loan.id,
        periodNumber: i,
        dueDate: pDate,
        beginningBalance: principal, // Simplified
        principalAmount: periodPrincipal,
        interestAmount: monthlyInterest,
        totalAmount: periodTotal,
        status:
          status === 'CLOSED'
            ? 'PAID'
            : status === 'OVERDUE'
              ? 'OVERDUE'
              : 'PENDING',
        paidAt: status === 'CLOSED' ? pDate : null,
        paidPrincipal: status === 'CLOSED' ? periodPrincipal : 0,
        paidInterest: status === 'CLOSED' ? monthlyInterest : 0,
        paidFee: 0,
        paidPenalty: 0,
      },
    });
  }

  // If Closed, add a Payment Record
  if (status === 'CLOSED') {
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + durationMonths); // Paid on due date

    const payment = await prisma.loanPayment.create({
      data: {
        loanId: loan.id,
        amount: totalRepayment,
        paymentType: 'PAYOFF',
        paymentMethod: 'CASH',
        paidAt: paymentDate,
        referenceCode: `PAY-${loanCode}-FULL`,
        recorderEmployeeId: 'seed-admin',
      },
    });

    // Allocation
    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        componentType: 'PRINCIPAL',
        amount: principal,
      },
    });
    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        componentType: 'INTEREST',
        amount: totalInterest,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
