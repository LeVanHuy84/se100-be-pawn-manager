import {
  PrismaClient,
  LoanStatus,
  RepaymentMethod,
  RepaymentItemStatus,
  PaymentType,
  PaymentMethod,
  DisbursementMethod,
  AuditEntityType,
  RevenueType,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../generated/prisma';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Configuration
const LOANS_PER_STORE_MIN = 15;
const LOANS_PER_STORE_MAX = 25;

async function main() {
  console.log('🚀 Starting comprehensive seeding process...');

  const dataPath = path.join(__dirname, 'seed-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const employees = data.employees || [
    { id: 'emp-001', name: 'Manager John', role: 'MANAGER' },
    { id: 'emp-002', name: 'Staff Mary', role: 'STAFF' },
  ];

  // 1. Seed Stores
  console.log('🌱 Seeding Stores...');
  const createdStores = [];
  for (const store of data.stores) {
    const existing = await prisma.store.findFirst({
      where: { name: store.name },
    });
    if (!existing) {
      createdStores.push(await prisma.store.create({ data: store }));
    } else {
      createdStores.push(existing);
    }
  }

  // 2. Seed LoanTypes
  console.log('🌱 Seeding LoanTypes...');
  const allLoanTypes = [];
  for (const loanType of data.loanTypes) {
    const existing = await prisma.loanType.findUnique({
      where: { name: loanType.name },
    });
    if (!existing) {
      const { id, ...dataWithoutId } = loanType;
      allLoanTypes.push(await prisma.loanType.create({ data: dataWithoutId }));
    } else {
      allLoanTypes.push(existing);
    }
  }

  // 3. Seed CollateralTypes
  console.log('🌱 Seeding CollateralTypes...');
  const allCollateralTypes = [];
  for (const type of data.commonCollateralTypes) {
    const existing = await prisma.collateralType.findFirst({
      where: { name: type.name },
    });
    if (!existing) {
      allCollateralTypes.push(
        await prisma.collateralType.create({ data: type }),
      );
    } else {
      allCollateralTypes.push(existing);
    }
  }

  // 4. Seed SystemParameters
  if (data.systemParameters) {
    console.log('🌱 Seeding SystemParameters...');
    for (const param of data.systemParameters) {
      // Dynamic update for Supported Loan Products
      if (param.paramKey === 'SUPPORTED_LOAN_PRODUCTS') {
        param.paramValue = JSON.stringify(allLoanTypes);
      }

      const exists = await prisma.systemParameter.findFirst({
        where: { paramGroup: param.paramGroup, paramKey: param.paramKey },
      });
      if (!exists) {
        await prisma.systemParameter.create({ data: param });
      } else {
        if (param.paramKey === 'SUPPORTED_LOAN_PRODUCTS') {
          await prisma.systemParameter.update({
            where: { id: exists.id },
            data: { paramValue: param.paramValue },
          });
        }
      }
    }

    console.log('🌱 Ensuring SUPPORTED_LOAN_TYPE parameter...');
    const supportedLoanTypeJson = JSON.stringify(allLoanTypes);
    const existingTypeParam = await prisma.systemParameter.findFirst({
      where: { paramGroup: 'SYSTEM', paramKey: 'SUPPORTED_LOAN_TYPE' },
    });

    if (existingTypeParam) {
      await prisma.systemParameter.update({
        where: { id: existingTypeParam.id },
        data: { paramValue: supportedLoanTypeJson },
      });
    } else {
      await prisma.systemParameter.create({
        data: {
          paramGroup: 'SYSTEM',
          paramKey: 'SUPPORTED_LOAN_TYPE',
          paramValue: supportedLoanTypeJson,
          dataType: 'JSON',
          description:
            'Crucial: List of supported loan types for loan creation configuration',
        },
      });
    }
  }

  // 5. Seed Customers
  console.log('🌱 Seeding Customers...');
  const allCustomers = [];
  for (const customer of data.customers) {
    const exists = await prisma.customer.findUnique({
      where: { nationalId: customer.nationalId },
    });
    if (!exists) {
      allCustomers.push(await prisma.customer.create({ data: customer }));
    } else {
      allCustomers.push(exists);
    }
  }

  // 6. Generate Comprehensive Loans
  console.log('🌱 Generating comprehensive loan data for reports...');

  const statuses: LoanStatus[] = [
    'ACTIVE',
    'ACTIVE',
    'ACTIVE',
    'CLOSED',
    'CLOSED',
    'OVERDUE',
    'PENDING',
    'REJECTED',
  ];

  let totalLoansCreated = 0;

  for (const store of createdStores) {
    console.log(`   Processing store: ${store.name}`);
    const loanCount = getRandomInt(LOANS_PER_STORE_MIN, LOANS_PER_STORE_MAX);

    for (let i = 0; i < loanCount; i++) {
      const customer = getRandomElement(allCustomers);
      const loanType = getRandomElement(allLoanTypes);
      const collateralType = getRandomElement(allCollateralTypes);
      const status = getRandomElement(statuses);
      const createdByEmp = getRandomElement(employees); // Who created the loan

      const uniqueSuffix = `${Date.now().toString().slice(-6)}${Math.floor(
        Math.random() * 1000,
      )}`;
      const loanCode = `LN-${store.name
        .substring(0, 3)
        .toUpperCase()}-${uniqueSuffix}`;

      const existing = await prisma.loan.findUnique({ where: { loanCode } });
      if (existing) continue;

      let baseAmount = 5000000;
      if (loanType.name.includes('CAR')) baseAmount = 100000000;
      else if (loanType.name.includes('BIKE')) baseAmount = 20000000;
      else if (loanType.name.includes('GOLD')) baseAmount = 15000000;
      else if (loanType.name.includes('LAPTOP')) baseAmount = 10000000;
      else if (loanType.name.includes('PHONE')) baseAmount = 5000000;

      const loanAmount = roundToNearest(
        baseAmount * (0.8 + Math.random() * 0.4),
        500000,
      );

      await createFullLoan(prisma, {
        loanCode,
        customer,
        store,
        loanType,
        collateralType,
        loanAmount,
        status,
        employees,
        createdByEmp,
      });
      totalLoansCreated++;
    }
  }

  console.log(
    `✨ Seeding completed. Total loans created: ${totalLoansCreated}`,
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roundToNearest(num: number, multiple: number) {
  return Math.round(num / multiple) * multiple;
}

async function createFullLoan(
  prisma: PrismaClient,
  params: {
    loanCode: string;
    customer: any;
    store: any;
    loanType: any;
    collateralType: any;
    loanAmount: number;
    status: LoanStatus;
    employees: any[];
    createdByEmp: any;
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
    employees,
    createdByEmp,
  } = params;

  const durationMonths = loanType.durationMonths;
  const appliedRate = Number(loanType.interestRateMonthly);
  const calculationRate = appliedRate / 100;

  const principal = loanAmount;
  const monthlyInterest = principal * calculationRate;
  const totalInterest = monthlyInterest * durationMonths;
  const totalFees = principal * 0.01; // 1% origination fee
  const totalRepayment = principal + totalInterest + totalFees;

  let startDate = new Date();
  let approvedAt: Date | null = new Date();
  let approvedByEmp = null;

  if (status === 'PENDING' || status === 'REJECTED') {
    startDate = new Date();
    approvedAt = null;
  } else if (status === 'ACTIVE') {
    const monthsAgo = getRandomInt(1, Math.min(durationMonths - 1, 1));
    startDate.setMonth(startDate.getMonth() - monthsAgo);
    approvedAt = new Date(startDate);
    approvedAt.setDate(approvedAt.getDate() - 2);
    approvedByEmp = getRandomElement(employees);
  } else if (status === 'CLOSED') {
    startDate.setMonth(startDate.getMonth() - durationMonths - 2);
    approvedAt = new Date(startDate);
    approvedAt.setDate(approvedAt.getDate() - 1);
    approvedByEmp = getRandomElement(employees);
  } else if (status === 'OVERDUE') {
    startDate.setMonth(startDate.getMonth() - durationMonths - 1);
    approvedAt = new Date(startDate);
    approvedAt.setDate(approvedAt.getDate() - 1);
    approvedByEmp = getRandomElement(employees);
  }

  const activatedAt =
    status === 'PENDING' || status === 'REJECTED' ? null : startDate;

  // 1. Create Loan
  const loan = await prisma.loan.create({
    data: {
      loanCode,
      customerId: customer.id,
      storeId: store.id,
      loanTypeId: loanType.id,
      loanAmount: principal,
      repaymentMethod: RepaymentMethod.INTEREST_ONLY,
      durationMonths: durationMonths,
      appliedInterestRate: appliedRate,
      latePaymentPenaltyRate: 0.05,
      totalInterest: totalInterest,
      totalFees: totalFees,
      totalRepayment: totalRepayment,
      monthlyPayment: monthlyInterest,
      status: status,
      startDate: startDate,
      approvedAt: approvedAt,
      approvedBy: approvedByEmp ? approvedByEmp.id : null,
      activatedAt: activatedAt,
      remainingAmount: status === 'CLOSED' ? 0 : totalRepayment,
      createdBy: createdByEmp.id,
    },
  });

  // 2. Log: Loan Creation
  await prisma.auditLog.create({
    data: {
      action: 'CREATE_LOAN',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loanCode,
      actorId: createdByEmp.id,
      actorName: createdByEmp.name,
      description: `Loan application created for ${customer.fullName}`,
      createdAt: new Date(startDate.getTime() - 86400000), // 1 day before start
    },
  });

  // 3. Log: Loan Approval (if approved)
  if (approvedAt && approvedByEmp) {
    // Audit
    await prisma.auditLog.create({
      data: {
        action: 'APPROVE_LOAN',
        entityId: loan.id,
        entityType: AuditEntityType.LOAN,
        entityName: loanCode,
        actorId: approvedByEmp.id,
        actorName: approvedByEmp.name,
        description: `Loan approved by ${approvedByEmp.name}`,
        createdAt: approvedAt,
      },
    });

    // Notification
    await prisma.notificationLog.create({
      data: {
        type: NotificationType.LOAN_APPROVED,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.SENT,
        loanId: loan.id,
        customerId: customer.id,
        subject: 'Loan Approved',
        message: `Your loan ${loanCode} has been approved.`,
        sentAt: approvedAt,
      },
    });
  }

  // 4. Create Collateral
  await prisma.collateral.create({
    data: {
      collateralTypeId: collateralType.id,
      ownerName: customer.fullName,
      collateralInfo: {
        description: `Seeded ${collateralType.name} Item for ${loanCode}`,
        condition: 'Good',
        brand: 'Generic',
        color: 'Black',
      },
      status:
        status === 'CLOSED'
          ? 'RELEASED'
          : status === 'PENDING'
            ? 'PROPOSED'
            : 'STORED',
      loanId: loan.id,
      storeId: store.id,
      receivedDate: activatedAt || new Date(),
      appraisedValue: principal * 1.25,
      ltvRatio: 0.8,
      images: {},
    },
  });

  if (status === 'PENDING' || status === 'REJECTED') {
    return;
  }

  // 5. Disbursement
  if (activatedAt) {
    const disburser = getRandomElement(employees);
    await prisma.disbursement.create({
      data: {
        loanId: loan.id,
        storeId: store.id,
        amount: principal,
        disbursementMethod: DisbursementMethod.CASH,
        disbursedAt: activatedAt,
        recipientName: customer.fullName,
        notes: 'Seeded disbursement',
        disbursedBy: disburser.id,
      },
    });

    // Audit Disbursement
    await prisma.auditLog.create({
      data: {
        action: 'DISBURSE_LOAN',
        entityId: loan.id,
        entityType: AuditEntityType.DISBURSEMENT, // or LOAN
        entityName: loanCode,
        actorId: disburser.id,
        actorName: disburser.name,
        description: `Disbursed ${principal} to ${customer.fullName}`,
        createdAt: activatedAt,
      },
    });
  }

  // 6. Repayment Schedule & Payments & Revenue
  for (let i = 1; i <= durationMonths; i++) {
    const pDate = new Date(startDate);
    pDate.setMonth(pDate.getMonth() + i);

    const isLast = i === durationMonths;
    const periodPrincipal = isLast ? principal : 0;
    const periodInterest = monthlyInterest;
    const periodFee = i === 1 ? totalFees : 0;
    const periodTotal = periodPrincipal + periodInterest + periodFee;

    let itemStatus: RepaymentItemStatus = 'PENDING';
    let paidAmount = 0;
    let paidPrincipal = 0;
    let paidInterest = 0;
    let paidFee = 0;
    let paidDate: Date | null = null;
    let recorderEmp: any = null;

    if (status === 'CLOSED') {
      itemStatus = 'PAID';
      paidPrincipal = periodPrincipal;
      paidInterest = periodInterest;
      paidFee = periodFee;
      paidAmount = periodTotal;
      paidDate = pDate;
      recorderEmp = getRandomElement(employees);
    } else if (status === 'ACTIVE') {
      if (pDate < new Date()) {
        itemStatus = 'PAID';
        paidPrincipal = periodPrincipal;
        paidInterest = periodInterest;
        paidFee = periodFee;
        paidAmount = periodTotal;
        paidDate = pDate;
        recorderEmp = getRandomElement(employees);
      }
    } else if (status === 'OVERDUE') {
      if (pDate < new Date()) {
        itemStatus = 'OVERDUE';
      }
    }

    const schedule = await prisma.repaymentScheduleDetail.create({
      data: {
        loanId: loan.id,
        periodNumber: i,
        dueDate: pDate,
        beginningBalance: principal,
        principalAmount: periodPrincipal,
        interestAmount: periodInterest,
        feeAmount: periodFee,
        penaltyAmount: 0,
        totalAmount: periodTotal,
        status: itemStatus,
        paidPrincipal,
        paidInterest,
        paidFee,
        paidPenalty: 0,
        paidAt: paidDate,
      },
    });

    if (itemStatus === 'PAID' && recorderEmp) {
      // Create Payment
      const payment = await prisma.loanPayment.create({
        data: {
          loanId: loan.id,
          storeId: store.id,
          amount: paidAmount,
          paymentType: 'PERIODIC',
          paymentMethod: PaymentMethod.CASH,
          paidAt: paidDate || new Date(),
          referenceCode: `PAY-${loanCode}-${i}`,
          recorderEmployeeId: recorderEmp.id,
        },
      });

      // Allocations
      if (paidPrincipal > 0) {
        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            componentType: 'PRINCIPAL',
            amount: paidPrincipal,
          },
        });
      }
      if (paidInterest > 0) {
        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            componentType: 'INTEREST',
            amount: paidInterest,
          },
        });

        // Revenue Log for Interest
        await prisma.revenueLedger.create({
          data: {
            type: RevenueType.INTEREST,
            amount: paidInterest,
            refId: payment.id,
            storeId: store.id,
            recordedAt: paidDate || new Date(),
          },
        });
      }
      if (paidFee > 0) {
        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            componentType: 'SERVICE_FEE',
            amount: paidFee,
          },
        });

        // Revenue Log for Fee
        await prisma.revenueLedger.create({
          data: {
            type: RevenueType.SERVICE_FEE,
            amount: paidFee,
            refId: payment.id,
            storeId: store.id,
            recordedAt: paidDate || new Date(),
          },
        });
      }

      // Audit for Payment
      await prisma.auditLog.create({
        data: {
          action: 'RECEIVE_PAYMENT',
          entityId: schedule.id, // Or payment.id
          entityType: AuditEntityType.LOAN_PAYMENT,
          entityName: payment.referenceCode,
          actorId: recorderEmp.id,
          actorName: recorderEmp.name,
          description: `Received payment of ${paidAmount} from ${customer.fullName}`,
          createdAt: paidDate || new Date(),
        },
      });
    }
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
