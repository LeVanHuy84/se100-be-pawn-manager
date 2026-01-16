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
  LocationLevel,
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

  // 0. Seed Locations
  console.log('🌱 Seeding Locations...');
  let city = await prisma.location.findUnique({ where: { code: '79' } });
  if (!city) {
    city = await prisma.location.create({
      data: {
        code: '79',
        name: 'Hồ Chí Minh',
        level: LocationLevel.PROVINCE,
      },
    });
  }
  let ward = await prisma.location.findFirst({ where: { code: '26734' } });
  if (!ward) {
    ward = await prisma.location.create({
      data: {
        code: '26734',
        name: 'Phường Bến Nghé',
        level: LocationLevel.WARD,
        parentId: city.id,
      },
    });
  }
  const defaultWardId = ward.id;

  // 1. Seed Stores
  console.log('🌱 Seeding Stores...');
  const createdStores = [];
  for (const store of data.stores) {
    const existing = await prisma.store.findFirst({
      where: { name: store.name },
    });
    if (!existing) {
      createdStores.push(
        await prisma.store.create({
          data: { ...store, wardId: defaultWardId },
        }),
      );
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
      // Remove ID to let autoincrement work if needed, or keep it if using @id
      // Schema uses @default(autoincrement()), passing ID is okay if it doesn't conflict
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
    // Ensure SUPPORTED_LOAN_TYPE
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
    // Handle 'No Email' case properly (JSON doesn't support undefined, but value might be null)
    if (customer.email === null) {
      delete customer.email; // Prisma create shouldn't receive 'null' if we want it to trigger default logic or if field is optional unique
      // Wait, Schema: email String? @unique. Pass null is fine.
    }

    // Check by nationalId
    const exists = await prisma.customer.findUnique({
      where: { nationalId: customer.nationalId },
    });
    if (!exists) {
      allCustomers.push(
        await prisma.customer.create({
          data: { ...customer, wardId: defaultWardId },
        }),
      );
    } else {
      allCustomers.push(exists);
    }
  }

  // 6. Generate Comprehensive Loans
  console.log('🌱 Generating comprehensive loan data for reports...');

  const statuses: LoanStatus[] = [
    'ACTIVE',
    'ACTIVE',
    'ACTIVE', // Bias towards Active
    'CLOSED',
    'CLOSED',
    'OVERDUE',
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
      const createdByEmp = getRandomElement(employees);

      // New: Varied Repayment Method
      const repaymentMethod =
        Math.random() > 0.7
          ? RepaymentMethod.EQUAL_INSTALLMENT
          : RepaymentMethod.INTEREST_ONLY;

      // New: Liquidation Scenario (rare)
      let isLiquidation = false;
      if (status === 'CLOSED' && Math.random() > 0.8) {
        isLiquidation = true;
      }

      const uniqueSuffix = `${Date.now().toString().slice(-6)}${Math.floor(
        Math.random() * 1000,
      )}`;
      const loanCode = `LN-${store.name
        .substring(0, 3)
        .toUpperCase()}-${uniqueSuffix}`;

      const existing = await prisma.loan.findUnique({ where: { loanCode } });
      if (existing) continue;

      // Determine Amount
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

      // Create
      await createFullLoan(prisma, {
        loanCode,
        customer,
        store,
        loanType,
        collateralType,
        loanAmount,
        status,
        repaymentMethod, // Pass distinct method
        isLiquidation, // Pass liquidation flag
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
    repaymentMethod: RepaymentMethod;
    isLiquidation: boolean;
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
    repaymentMethod,
    isLiquidation,
    employees,
    createdByEmp,
  } = params;

  const durationMonths = loanType.durationMonths;
  // Convert annual/monthly rate. Stored as monthly percent in DB?
  // Schema says interestRateMonthly Decimal @db.Decimal(7, 4)
  const appliedRate = Number(loanType.interestRateMonthly); // e.g., 2.5
  const monthlyRateDecimal = appliedRate / 100;

  let totalInterest = 0;
  let totalRepayment = 0;
  let monthlyPayment = 0;

  // CALCULATION LOGIC
  if (repaymentMethod === RepaymentMethod.INTEREST_ONLY) {
    const monthlyInterest = loanAmount * monthlyRateDecimal;
    totalInterest = monthlyInterest * durationMonths;
    monthlyPayment = monthlyInterest; // Only interest
    totalRepayment = loanAmount + totalInterest;
  } else {
    // Equal Installment (Amortization)
    // PMT = P * r * (1+r)^n / ((1+r)^n - 1)
    if (monthlyRateDecimal === 0) {
      monthlyPayment = loanAmount / durationMonths;
      totalInterest = 0;
    } else {
      const numerator =
        loanAmount *
        monthlyRateDecimal *
        Math.pow(1 + monthlyRateDecimal, durationMonths);
      const denominator = Math.pow(1 + monthlyRateDecimal, durationMonths) - 1;
      monthlyPayment = numerator / denominator;
    }
    totalRepayment = monthlyPayment * durationMonths;
    totalInterest = totalRepayment - loanAmount;
  }

  const totalFees = loanAmount * 0.01; // 1% origination
  totalRepayment += totalFees;

  // --- TIMELINE ---
  // Strategy: Shift everything to "Fresh" data for easier testing.
  // Report validation needs data "today" or "upcoming".

  let startDate = new Date(); // Default: NOW
  let approvedAt: Date | null = null;
  let approvedByEmp = null;

  // 1. PENDING: Created just now
  if (status === 'PENDING') {
    startDate = new Date();
    approvedAt = null;
  }

  // 2. REJECTED: Created today, rejected today
  else if (status === 'REJECTED') {
    startDate = new Date();
    approvedAt = null; // Spec doesn't strictly need approvedAt for rejection, usually separate rejectedAt
  }

  // 3. ACTIVE: Created recently (Today or slightly before to allow for "Upcoming Due" testing)
  else if (status === 'ACTIVE') {
    // Scenario A: Brand new loan (started today)
    // Scenario B: Started a few days ago (so first payment is coming up soon)
    const daysAgo = getRandomInt(0, 15);
    startDate.setDate(startDate.getDate() - daysAgo);

    approvedAt = new Date(startDate);
    approvedAt.setHours(approvedAt.getHours() - 2); // Approved 2 hours before start
    approvedByEmp = getRandomElement(employees);
  }

  // 4. CLOSED/OVERDUE: Minimal historical data for validation (1-2 months ago max)
  else if (status === 'CLOSED' || status === 'OVERDUE') {
    // Start date just enough in the past to fit the duration or allow closing
    // If duration is 6 months, we simulate it started 7 months ago
    const offsetMonths = durationMonths + 1;
    startDate.setMonth(startDate.getMonth() - offsetMonths);

    approvedAt = new Date(startDate);
    approvedAt.setDate(approvedAt.getDate() - 1);
    approvedByEmp = getRandomElement(employees);
  }

  const activatedAt =
    status === 'PENDING' || status === 'REJECTED' ? null : startDate;
  // Created just before approval/start
  const createdAt = new Date(startDate);
  createdAt.setHours(createdAt.getHours() - 24);

  // 1. Create Loan
  const loan = await prisma.loan.create({
    data: {
      loanCode,
      customerId: customer.id,
      storeId: store.id,
      loanTypeId: loanType.id,
      loanAmount: loanAmount,
      repaymentMethod: repaymentMethod,
      durationMonths: durationMonths,
      appliedInterestRate: appliedRate,
      latePaymentPenaltyRate: 0.05,
      totalInterest: totalInterest,
      totalFees: totalFees,
      totalRepayment: totalRepayment,
      monthlyPayment: monthlyPayment,
      status: status,
      startDate: startDate,
      approvedAt: approvedAt,
      approvedBy: approvedByEmp ? approvedByEmp.id : null,
      activatedAt: activatedAt,
      remainingAmount: status === 'CLOSED' ? 0 : totalRepayment,
      createdBy: createdByEmp.id,
      createdAt: createdAt,
      updatedAt: new Date(), // Always fresh update
    },
  });

  // 2. Audit Log: Use createdAt
  await prisma.auditLog.create({
    data: {
      action: 'CREATE_LOAN',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loanCode,
      actorId: createdByEmp.id,
      actorName: createdByEmp.name,
      description: `Loan application created for ${customer.fullName}`,
      createdAt: createdAt,
    },
  });

  // 3. Approval
  if (approvedAt && approvedByEmp && status !== 'REJECTED') {
    await prisma.auditLog.create({
      data: {
        action: 'APPROVE_LOAN',
        entityId: loan.id,
        entityType: AuditEntityType.LOAN, // Fixed Enum
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
        createdAt: approvedAt,
      },
    });
  } else if (status === 'REJECTED') {
    // Rejection Log
    await prisma.auditLog.create({
      data: {
        action: 'REJECT_LOAN',
        entityId: loan.id,
        entityType: AuditEntityType.LOAN,
        entityName: loanCode,
        actorId: getRandomElement(employees).id,
        description: 'Loan rejected due to policy.',
        createdAt: new Date(),
      },
    });
  }

  // 4. Collateral
  // Logic: REJECTED -> PROPOSED (Never held) or RELEASED (Returned)
  // Logic: CLOSED + Liquidation -> SOLD
  // Logic: CLOSED + Normal -> RELEASED
  // Logic: ACTIVE/OVERDUE -> STORED
  let collateralStatus = 'STORED';
  if (status === 'REJECTED') collateralStatus = 'PROPOSED';
  else if (status === 'PENDING') collateralStatus = 'PROPOSED';
  else if (status === 'CLOSED') {
    collateralStatus = isLiquidation ? 'SOLD' : 'RELEASED';
  } else if (status === 'ACTIVE' || status === 'OVERDUE') {
    collateralStatus = 'STORED';
  }

  const collateral = await prisma.collateral.create({
    data: {
      collateralTypeId: collateralType.id,
      ownerName: customer.fullName,
      collateralInfo: {
        description: `Seeded ${collateralType.name} Item for ${loanCode}`,
        condition: 'Good',
      },
      status: collateralStatus as any, // Cast if string doesn't implicitly match enum in TS
      loanId: loan.id,
      storeId: store.id,
      receivedDate:
        status !== 'PENDING' && status !== 'REJECTED' ? activatedAt : null,
      appraisedValue: loanAmount * 1.25,
      ltvRatio: 0.8,
      images: {},
      sellPrice: isLiquidation ? loanAmount * 1.1 : null,
      sellDate: isLiquidation ? new Date() : null,
    },
  });

  if (isLiquidation) {
    // Revenue for Liquidation
    await prisma.revenueLedger.create({
      data: {
        type: RevenueType.LIQUIDATION_EXCESS,
        amount: loanAmount * 1.1 - loanAmount,
        refId: collateral.id,
        storeId: store.id,
        recordedAt: new Date(),
      },
    });
  }

  // 5. Disbursement
  if (activatedAt) {
    // Varied Method
    const method =
      Math.random() > 0.5
        ? DisbursementMethod.CASH
        : DisbursementMethod.BANK_TRANSFER;
    const disburser = getRandomElement(employees);

    await prisma.disbursement.create({
      data: {
        loanId: loan.id,
        storeId: store.id,
        amount: loanAmount,
        disbursementMethod: method,
        disbursedAt: activatedAt,
        recipientName: customer.fullName,
        notes: 'Seeded disbursement',
        disbursedBy: disburser.id,
        bankName: method === 'BANK_TRANSFER' ? 'Vietcombank' : null,
        bankAccountNumber: method === 'BANK_TRANSFER' ? '9999888877' : null,
      },
    });
  }

  // 6. Schedule & Payments (The critical part for Dashboard)
  // We want dates in the FUTURE for Active loans.
  let remainingPrincipal = loanAmount;

  for (let i = 1; i <= durationMonths; i++) {
    // Generate FUTURE dates for schedules
    const pDate = new Date(startDate);
    pDate.setMonth(pDate.getMonth() + i);

    // If Loan is ACTIVE, pDate should likely be in the future (or very recent past)
    // If Loan is CLOSED, pDate was in the past.

    const isLast = i === durationMonths;

    // Per-period values depend on methodology
    let periodPrincipal = 0;
    let periodInterest = 0;
    let periodFee = i === 1 ? totalFees : 0;
    let beginningBalance = remainingPrincipal;

    if (repaymentMethod === RepaymentMethod.INTEREST_ONLY) {
      periodInterest = loanAmount * monthlyRateDecimal;
      periodPrincipal = isLast ? loanAmount : 0;
    } else {
      // Equal Installment (Amortization)
      // PMT = P * r * (1+r)^n / ((1+r)^n - 1)
      if (monthlyRateDecimal === 0) {
        monthlyPayment = loanAmount / durationMonths;
        totalInterest = 0;
      } else {
        const numerator =
          loanAmount *
          monthlyRateDecimal *
          Math.pow(1 + monthlyRateDecimal, durationMonths);
        const denominator =
          Math.pow(1 + monthlyRateDecimal, durationMonths) - 1;
        monthlyPayment = numerator / denominator;
      }
      // Interest part
      periodInterest = remainingPrincipal * monthlyRateDecimal;
      // Principal part
      periodPrincipal = monthlyPayment - periodInterest;
      // Adjust for last month precision
      if (isLast) {
        periodPrincipal = remainingPrincipal;
        periodInterest = monthlyPayment - periodPrincipal; // Recalculate interest match
      }
    }

    remainingPrincipal -= periodPrincipal;
    if (remainingPrincipal < 0) remainingPrincipal = 0;
    const periodTotal = periodPrincipal + periodInterest + periodFee;

    // --- STATUS LOGIC FOR DASHBOARD ---
    let itemStatus: RepaymentItemStatus = 'PENDING'; // Default to FUTURE
    let paidDate: Date | null = null;
    let recorderEmp: any = null;

    if (status === 'CLOSED') {
      itemStatus = 'PAID';
      paidDate = pDate; // Past Date
    } else if (status === 'OVERDUE') {
      // If the schedule date is in the past, it's overdue
      if (pDate < new Date()) {
        itemStatus = 'OVERDUE';
      } else {
        itemStatus = 'PENDING';
      }
    } else if (status === 'ACTIVE') {
      // If date is in past, it must be PAID (since status is Active aka 'Good Standing')
      if (pDate <= new Date()) {
        itemStatus = 'PAID';
        paidDate = pDate;
      } else {
        // Date is in Future -> PENDING (This is what you want for dashboards)
        itemStatus = 'PENDING';
      }
    }

    const schedule = await prisma.repaymentScheduleDetail.create({
      data: {
        loanId: loan.id,
        periodNumber: i,
        dueDate: pDate,
        beginningBalance: beginningBalance,
        principalAmount: periodPrincipal,
        interestAmount: periodInterest,
        feeAmount: periodFee,
        totalAmount: periodTotal,
        status: itemStatus,
        paidPrincipal: itemStatus === 'PAID' ? periodPrincipal : 0,
        paidInterest: itemStatus === 'PAID' ? periodInterest : 0,
        paidFee: itemStatus === 'PAID' ? periodFee : 0,
        paidAt: itemStatus === 'PAID' ? paidDate || new Date() : null,
      },
    });

    // Create Actual Payment Record if PAID
    if (itemStatus === 'PAID') {
      recorderEmp = getRandomElement(employees);
      const payMethod =
        Math.random() > 0.6 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH;

      const payment = await prisma.loanPayment.create({
        data: {
          loanId: loan.id,
          storeId: store.id,
          amount: periodTotal,
          paymentType: 'PERIODIC',
          paymentMethod: payMethod,
          paidAt: paidDate || new Date(),
          referenceCode: `PAY-${loanCode}-${i}`,
          recorderEmployeeId: recorderEmp.id,
          createdAt: paidDate || new Date(),
        },
      });

      // Simple Allocation for standard payments
      if (periodPrincipal > 0) {
        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            componentType: 'PRINCIPAL',
            amount: periodPrincipal,
          },
        });
      }
      if (periodInterest > 0) {
        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            componentType: 'INTEREST',
            amount: periodInterest,
          },
        });
        await prisma.revenueLedger.create({
          data: {
            type: RevenueType.INTEREST,
            amount: periodInterest,
            refId: payment.id,
            storeId: store.id,
            recordedAt: paidDate || new Date(),
          },
        });
      }
      if (periodFee > 0) {
        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            componentType: 'SERVICE_FEE',
            amount: periodFee,
          },
        });
        await prisma.revenueLedger.create({
          data: {
            type: RevenueType.SERVICE_FEE,
            amount: periodFee,
            refId: payment.id,
            storeId: store.id,
            recordedAt: paidDate || new Date(),
          },
        });
      }
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
