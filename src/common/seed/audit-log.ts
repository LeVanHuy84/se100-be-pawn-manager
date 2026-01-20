import { AuditLog, Prisma, PrismaClient } from '../../../generated/prisma';
import { AuditEntityType } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding Audit Logs...');

  // Lấy dữ liệu cần thiết
  const loans = await prisma.loan.findMany();
  const payments = await prisma.loanPayment.findMany();
  const repaymentSchedules = await prisma.repaymentScheduleDetail.findMany();

  if (loans.length === 0) {
    console.error(
      '❌ Lỗi: Không có dữ liệu để tạo audit log. Chạy seed loan trước!',
    );
    return;
  }

  console.log(`Found ${loans.length} loans`);
  console.log(`Found ${payments.length} payments`);
  console.log(`Found ${repaymentSchedules.length} repayment schedules`);

  const auditLogs: Prisma.AuditLogCreateManyInput[] = [];

  // === 1. Audit logs cho việc tạo Loan ===
  for (const loan of loans) {
    auditLogs.push({
      action: 'CREATE_LOAN',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loan.loanCode,
      actorId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      actorName: 'Nguyen Trung Truc',
      newValue: {
        loanCode: loan.loanCode,
        loanAmount: loan.loanAmount.toString(),
        status: loan.status,
        repaymentMethod: loan.repaymentMethod,
        durationMonths: loan.durationMonths,
      },
      description: `Created loan ${loan.loanCode} with amount ${loan.loanAmount} VND`,
      createdAt: loan.createdAt,
    });
  }

  // === 2. Audit logs cho việc duyệt Loan ===
  const approvedLoans = loans.filter((l) => l.approvedAt !== null);
  for (const loan of approvedLoans) {
    auditLogs.push({
      action: 'APPROVE_LOAN',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loan.loanCode,
      actorId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      actorName: 'Nguyen Trung Truc',
      oldValue: {
        status: 'PENDING',
      },
      newValue: {
        status: loan.status,
        approvedAt: loan.approvedAt,
      },
      description: `Approved loan ${loan.loanCode}`,
      createdAt: loan.approvedAt || loan.updatedAt,
    });
  }

  // === 3. Audit logs cho việc kích hoạt Loan ===
  const activatedLoans = loans.filter((l) => l.activatedAt !== null);
  for (const loan of activatedLoans) {
    auditLogs.push({
      action: 'ACTIVATE_LOAN',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loan.loanCode,
      actorId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      actorName: 'Nguyen Trung Truc',
      oldValue: {
        status: 'PENDING',
      },
      newValue: {
        status: 'ACTIVE',
        activatedAt: loan.activatedAt,
        startDate: loan.startDate,
      },
      description: `Activated loan ${loan.loanCode} - Disbursed amount ${loan.loanAmount} VND`,
      createdAt: loan.activatedAt || loan.updatedAt,
    });
  }

  // === 4. Audit logs cho các Payment ===
  for (const payment of payments) {
    const loan = loans.find((l) => l.id === payment.loanId);
    const allocations = await prisma.paymentAllocation.findMany({
      where: { paymentId: payment.id },
    });

    auditLogs.push({
      action: 'CREATE_PAYMENT',
      entityId: payment.id,
      entityType: AuditEntityType.LOAN_PAYMENT,
      entityName: `Thanh toán - ${loan?.loanCode} ${payment.referenceCode ?? '(' + payment.referenceCode + ')'}`,
      actorId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      actorName: 'Nguyen Trung Truc',
      newValue: {
        paymentId: payment.id,
        loanCode: loan?.loanCode,
        amount: payment.amount.toString(),
        paymentType: payment.paymentType,
        paymentMethod: payment.paymentMethod,
        allocations: allocations.map((a) => ({
          component: a.componentType,
          amount: a.amount.toString(),
        })),
      },
      description: `Recorded payment ${payment.referenceCode || payment.id} for loan ${loan?.loanCode} - Amount: ${payment.amount} VND (${payment.paymentType})`,
      createdAt: payment.paidAt,
    });
  }

  // === 5. Audit logs cho việc cập nhật Repayment Schedule (PAID) ===
  const paidSchedules = repaymentSchedules.filter((s) => s.status === 'PAID');
  for (const schedule of paidSchedules) {
    const loan = loans.find((l) => l.id === schedule.loanId);

    auditLogs.push({
      action: 'UPDATE_REPAYMENT_SCHEDULE',
      entityId: schedule.id,
      entityType: AuditEntityType.REPAYMENT_SCHEDULE,
      entityName: `${loan?.loanCode} - Period ${schedule.periodNumber}`,
      actorId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      actorName: 'Nguyen Trung Truc',
      oldValue: {
        status: 'PENDING',
        paidPrincipal: 0,
        paidInterest: 0,
        paidFee: 0,
      },
      newValue: {
        status: 'PAID',
        paidPrincipal: schedule.paidPrincipal?.toString(),
        paidInterest: schedule.paidInterest?.toString(),
        paidFee: schedule.paidFee?.toString(),
        paidAt: schedule.paidAt,
      },
      description: `Updated repayment schedule for ${loan?.loanCode} period ${schedule.periodNumber} to PAID`,
      createdAt: schedule.paidAt || new Date(),
    });
  }

  // === 6. Audit logs cho việc cập nhật Repayment Schedule (OVERDUE) ===
  const overdueSchedules = repaymentSchedules.filter(
    (s) => s.status === 'OVERDUE',
  );
  for (const schedule of overdueSchedules) {
    const loan = loans.find((l) => l.id === schedule.loanId);

    auditLogs.push({
      action: 'SYSTEM_MARK_OVERDUE',
      entityId: schedule.id,
      entityType: AuditEntityType.REPAYMENT_SCHEDULE,
      entityName: `${loan?.loanCode} - Period ${schedule.periodNumber}`,
      actorId: null,
      actorName: 'SYSTEM',
      oldValue: {
        status: 'PENDING',
      },
      newValue: {
        status: 'OVERDUE',
        dueDate: schedule.dueDate,
      },
      description: `System marked repayment schedule for ${loan?.loanCode} period ${schedule.periodNumber} as OVERDUE`,
      createdAt: schedule.dueDate,
    });
  }

  // === 7. Audit logs cho việc áp dụng phí phạt (Penalty) ===
  const schedulesWithPenalty = repaymentSchedules.filter(
    (s) => parseFloat(s.penaltyAmount.toString()) > 0,
  );
  for (const schedule of schedulesWithPenalty) {
    const loan = loans.find((l) => l.id === schedule.loanId);

    auditLogs.push({
      action: 'SYSTEM_APPLY_PENALTY',
      entityId: schedule.id,
      entityType: AuditEntityType.REPAYMENT_SCHEDULE,
      entityName: `${loan?.loanCode} - Period ${schedule.periodNumber}`,
      actorId: null,
      actorName: 'SYSTEM',
      oldValue: {
        penaltyAmount: 0,
      },
      newValue: {
        penaltyAmount: schedule.penaltyAmount.toString(),
        lastPenaltyAppliedAt: schedule.lastPenaltyAppliedAt,
      },
      description: `System applied penalty ${schedule.penaltyAmount} VND for overdue payment on ${loan?.loanCode} period ${schedule.periodNumber}`,
      createdAt: schedule.lastPenaltyAppliedAt || new Date(),
    });
  }

  // === 8. Audit logs cho việc đóng Loan ===
  const closedLoans = loans.filter((l) => l.status === 'CLOSED');
  for (const loan of closedLoans) {
    auditLogs.push({
      action: 'CLOSE_LOAN',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loan.loanCode,
      actorId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      actorName: 'Nguyen Trung Truc',
      oldValue: {
        status: 'ACTIVE',
        remainingAmount: loan.totalRepayment.toString(),
      },
      newValue: {
        status: 'CLOSED',
        remainingAmount: '0',
      },
      description: `Closed loan ${loan.loanCode} - Full payment received`,
      createdAt: loan.updatedAt,
    });
  }

  // === 9. Audit logs cho việc cập nhật Loan status (OVERDUE) ===
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE');
  for (const loan of overdueLoans) {
    auditLogs.push({
      action: 'SYSTEM_MARK_LOAN_OVERDUE',
      entityId: loan.id,
      entityType: AuditEntityType.LOAN,
      entityName: loan.loanCode,
      actorId: null,
      actorName: 'SYSTEM',
      oldValue: {
        status: 'ACTIVE',
      },
      newValue: {
        status: 'OVERDUE',
      },
      description: `System marked loan ${loan.loanCode} as OVERDUE due to missed payments`,
      createdAt: loan.updatedAt,
    });
  }

  // === 10. Audit logs mẫu cho việc update loan amount (ví dụ điều chỉnh) ===
  const loan1 = loans.find((l) => l.loanCode === 'LN-2026-000001');
  if (loan1) {
    auditLogs.push({
      action: 'UPDATE_LOAN',
      entityId: loan1.id,
      entityType: AuditEntityType.LOAN,
      entityName: loan1.loanCode,
      actorId: 'user_36CjmrStyh4ftbXRS5FL4rmNJrU',
      actorName: 'Nguyen Trung Truc',
      oldValue: {
        remainingAmount: loan1.totalRepayment.toString(),
      },
      newValue: {
        remainingAmount: loan1.remainingAmount.toString(),
      },
      description: `Updated remaining amount for loan ${loan1.loanCode} after payment`,
      createdAt: new Date('2026-02-01'),
    });
  }

  // Tạo tất cả audit logs
  await prisma.auditLog.createMany({
    data: auditLogs,
  });

  console.log(`✅ Created ${auditLogs.length} audit log entries`);
  console.log('✅ Audit log seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
