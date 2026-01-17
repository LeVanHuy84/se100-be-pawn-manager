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
const LOANS_PER_STORE_MIN = 30; // Increased for better data density
const LOANS_PER_STORE_MAX = 50;

async function main() {
  console.log('🚀 Bắt đầu quá trình khởi tạo dữ liệu mẫu...');

  const dataPath = path.join(__dirname, 'seed-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const employees = data.employees || [
    { id: 'emp-001', name: 'Quản lý Hùng', role: 'MANAGER' },
    { id: 'emp-002', name: 'Nhân viên Mai', role: 'STAFF' },
  ];

  // 0. Seed Locations
  console.log('🌱 Khởi tạo Địa điểm (Locations)...');
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
  console.log('🌱 Khởi tạo Cửa hàng (Stores)...');
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
  console.log('🌱 Khởi tạo Loại hình vay (LoanTypes)...');
  const allLoanTypes = [];
  for (const loanType of data.loanTypes) {
    const existing = await prisma.loanType.findUnique({
      where: { name: loanType.name },
    });
    if (!existing) {
      const { id, ...dataWithoutId } = loanType;
      // Remove ID to let autoincrement work if needed, or keep it if using @id
      allLoanTypes.push(await prisma.loanType.create({ data: dataWithoutId }));
    } else {
      allLoanTypes.push(existing);
    }
  }

  // 3. Seed CollateralTypes
  console.log('🌱 Khởi tạo Loại tài sản (CollateralTypes)...');
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
    console.log('🌱 Khởi tạo Tham số hệ thống (SystemParameters)...');
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
  console.log('🌱 Khởi tạo Khách hàng (Customers)...');
  const allCustomers = [];
  for (const customer of data.customers) {
    if (customer.email === null) {
      delete customer.email;
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
  console.log('🌱 Tạo dữ liệu Hợp đồng vay tổng hợp cho báo cáo...');

  const statuses: LoanStatus[] = [
    'ACTIVE',
    'ACTIVE',
    'ACTIVE', // Bias towards Active
    'ACTIVE',
    'CLOSED',
    'CLOSED',
    'OVERDUE',
    'OVERDUE', // Increased Overdue frequency slightly
    'PENDING',
    'REJECTED',
  ];

  let totalLoansCreated = 0;

  for (const store of createdStores) {
    console.log(`   Đang xử lý cửa hàng: ${store.name}`);
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
      const loanCode = `HĐ-${store.name
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
    `✨ Quá trình seed dữ liệu hoàn tất. Tổng số hợp đồng: ${totalLoansCreated}`,
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
    approvedAt = null;
  }

  // 3. ACTIVE: Spread across duration to enable revenue population
  else if (status === 'ACTIVE') {
    // Randomly place the start date in the past, up to the duration limit.
    // This allows us to have loans in various stages (month 1, month 5, etc.)
    // generating revenue (Paid status) for past months.
    const maxHistoryDays = Math.max((durationMonths - 1) * 30, 30);
    const daysAgo = getRandomInt(0, maxHistoryDays);
    startDate.setDate(startDate.getDate() - daysAgo);

    approvedAt = new Date(startDate);
    approvedAt.setHours(approvedAt.getHours() - 4);
    approvedByEmp = getRandomElement(employees);
  }

  // 4. CLOSED: Completed or liquidated in the recent past
  else if (status === 'CLOSED') {
    // Start date enough in past to complete duration
    // Plus some random months so they didn't all close yesterday
    const offsetMonths = durationMonths + getRandomInt(1, 6);
    startDate.setMonth(startDate.getMonth() - offsetMonths);

    approvedAt = new Date(startDate);
    approvedAt.setDate(approvedAt.getDate() - 1);
    approvedByEmp = getRandomElement(employees);
  }

  // 5. OVERDUE: "NEAR" - The loan is active but missed a recent payment.
  else if (status === 'OVERDUE') {
    // Determine start date such that a payment was due recently (e.g., 5-10 days ago) and missed.
    // Let's say we are in Month 2. Start date = Now - (1 month + 10 days).
    // Payment 1 (due 10 days ago) -> Missed -> Overdue.

    // Pick a random month to be the overdue one (usually early in loan).
    const overdueMonthIndex = getRandomInt(1, Math.min(3, durationMonths));
    const overdueDays = getRandomInt(1, 15); // Days it has been overdue

    // Start date = Now - (overdueMonthIndex * 30 days) - overdueDays
    const daysAgo = overdueMonthIndex * 30 + overdueDays;
    startDate.setDate(startDate.getDate() - daysAgo);

    approvedAt = new Date(startDate);
    approvedAt.setHours(approvedAt.getHours() - 2);
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
      remainingAmount: status === 'CLOSED' ? 0 : totalRepayment, // Simplified remaining calc
      createdBy: createdByEmp.id,
      createdAt: createdAt,
      updatedAt: new Date(),
    },
  });

  // 2. Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'CREATE_LOAN',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loanCode,
      actorId: createdByEmp.id,
      actorName: createdByEmp.name,
      description: `Hồ sơ vay mới cho khách hàng ${customer.fullName}`,
      createdAt: createdAt,
    },
  });

  // 3. Approval
  if (approvedAt && approvedByEmp && status !== 'REJECTED') {
    await prisma.auditLog.create({
      data: {
        action: 'APPROVE_LOAN',
        entityId: loan.id,
        entityType: AuditEntityType.LOAN,
        entityName: loanCode,
        actorId: approvedByEmp.id,
        actorName: approvedByEmp.name,
        description: `Hợp đồng được duyệt bởi ${approvedByEmp.name}`,
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
        subject: 'Hợp đồng được duyệt',
        message: `Hợp đồng vay ${loanCode} của quý khách đã được duyệt.`,
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
        description: 'Hồ sơ bị từ chối do không đạt yêu cầu.',
        createdAt: new Date(),
      },
    });
  }

  // 4. Collateral
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
        description: `Tài sản ${collateralType.name} cho HĐ ${loanCode}`,
        condition: 'Tốt (Good)',
      },
      status: collateralStatus as any,
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
        notes: 'Giải ngân hợp đồng mới',
        disbursedBy: disburser.id,
        bankName: method === 'BANK_TRANSFER' ? 'Vietcombank' : null,
        bankAccountNumber: method === 'BANK_TRANSFER' ? '9999888877' : null,
      },
    });
  }

  // 6. Schedule & Payments (The critical part for Dashboard)
  let remainingPrincipal = loanAmount;

  for (let i = 1; i <= durationMonths; i++) {
    // Generate dates based on startDate
    const pDate = new Date(startDate);
    pDate.setMonth(pDate.getMonth() + i);

    const isLast = i === durationMonths;

    // Per-period values
    let periodPrincipal = 0;
    let periodInterest = 0;
    let periodFee = i === 1 ? totalFees : 0;
    let beginningBalance = remainingPrincipal;

    if (repaymentMethod === RepaymentMethod.INTEREST_ONLY) {
      periodInterest = loanAmount * monthlyRateDecimal;
      periodPrincipal = isLast ? loanAmount : 0;
    } else {
      // Equal Installment
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
      periodInterest = remainingPrincipal * monthlyRateDecimal;
      periodPrincipal = monthlyPayment - periodInterest;
      if (isLast) {
        periodPrincipal = remainingPrincipal;
        periodInterest = monthlyPayment - periodPrincipal;
      }
    }

    remainingPrincipal -= periodPrincipal;
    if (remainingPrincipal < 0) remainingPrincipal = 0;
    const periodTotal = periodPrincipal + periodInterest + periodFee;

    // --- STATUS LOGIC FOR DASHBOARD ---
    let itemStatus: RepaymentItemStatus = 'PENDING';
    let paidDate: Date | null = null;
    let recorderEmp: any = null;

    if (status === 'CLOSED') {
      itemStatus = 'PAID';
      // Jitter payment date slightly for realism
      paidDate = new Date(pDate);
      paidDate.setDate(paidDate.getDate() + getRandomInt(-2, 2));
    } else if (status === 'OVERDUE') {
      if (pDate < new Date()) {
        // This schedule is in the past
        // Randomly decide if this specific one was missed or paid, but at least one must be missed to be OVERDUE
        // Logic: If it's the *latest* one, it's missed. Previous ones might be paid.
        // Simple logic: All past due are overdue for this seed scenario to emphasize "Overdue" status
        itemStatus = 'OVERDUE';
      } else {
        itemStatus = 'PENDING';
      }
    } else if (status === 'ACTIVE') {
      if (pDate <= new Date()) {
        // Date is in past -> Assumed PAID for Good Standing Active Loans
        itemStatus = 'PAID';
        paidDate = new Date(pDate);
        // Add random jitter to paidDate (-2 to +2 days) to populate daily revenue chart naturally
        paidDate.setDate(paidDate.getDate() + getRandomInt(-2, 2));
      } else {
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

      const actPayDate = paidDate || new Date();

      const payment = await prisma.loanPayment.create({
        data: {
          loanId: loan.id,
          storeId: store.id,
          amount: periodTotal,
          paymentType: 'PERIODIC',
          paymentMethod: payMethod,
          paidAt: actPayDate,
          referenceCode: `PAY-${loanCode}-${i}`,
          recorderEmployeeId: recorderEmp.id,
          createdAt: actPayDate,
        },
      });

      // Simple Allocation
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
            recordedAt: actPayDate,
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
            recordedAt: actPayDate,
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
