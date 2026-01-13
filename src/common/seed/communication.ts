import {
  PrismaClient,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding Communication/Notification Logs...');

  // Lấy các khoản vay đã ACTIVE
  const activeLoans = await prisma.loan.findMany({
    where: {
      status: {
        in: ['ACTIVE', 'OVERDUE'],
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
      repaymentSchedule: {
        where: {
          periodNumber: 1,
        },
        take: 1,
      },
    },
    orderBy: {
      approvedAt: 'asc',
    },
  });

  if (activeLoans.length === 0) {
    console.log('⚠️  No active loans found. Skipping notification seeding.');
    return;
  }

  console.log(`Found ${activeLoans.length} active/overdue loans`);

  let createdCount = 0;

  for (const loan of activeLoans) {
    const firstPayment = loan.repaymentSchedule[0];
    if (!firstPayment) continue;

    const dueDate = new Date(firstPayment.dueDate).toLocaleDateString('vi-VN');
    const amount = Number(firstPayment.totalAmount).toLocaleString('vi-VN');

    // 1. LOAN_APPROVED Notification (SMS + Email)
    if (loan.customer.phone) {
      await prisma.notificationLog.create({
        data: {
          type: NotificationType.LOAN_APPROVED,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.SENT,
          loanId: loan.id,
          customerId: loan.customer.id,
          subject: 'Thông báo khoản vay được duyệt',
          message: `[Cầm đồ] Xin chào ${loan.customer.fullName}!
Khoản vay của bạn đã được duyệt.
Số tiền vay: ${Number(loan.loanAmount).toLocaleString('vi-VN')} VND
Kỳ đầu tiên đến hạn: ${dueDate}
Số tiền: ${amount} VND
Cảm ơn bạn đã tin tưởng!`,
          recipientContact: loan.customer.phone,
          sentAt: loan.approvedAt || loan.activatedAt,
        },
      });
      createdCount++;
    }

    if (loan.customer.email) {
      await prisma.notificationLog.create({
        data: {
          type: NotificationType.LOAN_APPROVED,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.DELIVERED,
          loanId: loan.id,
          customerId: loan.customer.id,
          subject: 'Thông báo khoản vay được duyệt',
          message: `Xin chào ${loan.customer.fullName},

Chúc mừng! Khoản vay của bạn đã được phê duyệt.

Chi tiết khoản vay:
- Mã khoản vay: ${loan.loanCode}
- Số tiền vay: ${Number(loan.loanAmount).toLocaleString('vi-VN')} VND
- Kỳ thanh toán đầu tiên: ${dueDate}
- Số tiền kỳ đầu: ${amount} VND

Vui lòng thanh toán đúng hạn để tránh phát sinh phí phạt.

Trân trọng,
Hệ thống Cầm đồ`,
          recipientContact: loan.customer.email,
          sentAt: loan.approvedAt || loan.activatedAt,
        },
      });
      createdCount++;
    }

    // 2. INTEREST_REMINDER (3 days before due date)
    const reminderDate = new Date(firstPayment.dueDate);
    reminderDate.setDate(reminderDate.getDate() - 3);

    if (loan.customer.phone && reminderDate <= new Date()) {
      await prisma.notificationLog.create({
        data: {
          type: NotificationType.INTEREST_REMINDER,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.SENT,
          loanId: loan.id,
          customerId: loan.customer.id,
          subject: 'Nhắc nhở thanh toán sắp đến hạn',
          message: `[Cầm đồ] Nhắc nhở ${loan.customer.fullName}!
Khoản vay ${loan.loanCode} sẽ đến hạn vào ${dueDate}.
Số tiền cần thanh toán: ${amount} VND
Vui lòng thanh toán đúng hạn để tránh phí phạt.`,
          recipientContact: loan.customer.phone,
          sentAt: reminderDate,
        },
      });
      createdCount++;
    }

    // 3. PHONE_CALL reminder for some loans (30% chance)
    if (Math.random() < 0.3) {
      const callStatus =
        Math.random() < 0.7
          ? NotificationStatus.ANSWERED
          : NotificationStatus.NO_ANSWER;
      const callDuration =
        callStatus === NotificationStatus.ANSWERED
          ? Math.floor(Math.random() * 180) + 60 // 60-240 seconds
          : 0;

      const promiseToPayDate =
        callStatus === NotificationStatus.ANSWERED && Math.random() < 0.8
          ? new Date(firstPayment.dueDate)
          : null;

      await prisma.notificationLog.create({
        data: {
          type: NotificationType.INTEREST_REMINDER,
          channel: NotificationChannel.PHONE_CALL,
          status:
            callStatus === NotificationStatus.ANSWERED && promiseToPayDate
              ? NotificationStatus.PROMISE_TO_PAY
              : callStatus,
          loanId: loan.id,
          customerId: loan.customer.id,
          subject: 'Gọi nhắc thanh toán',
          message: `Gọi nhắc khách về khoản vay ${loan.loanCode}`,
          recipientContact: loan.customer.phone,
          callDuration,
          employeeId: loan.approvedBy || 'user_admin123',
          notes:
            callStatus === NotificationStatus.ANSWERED
              ? promiseToPayDate
                ? `Khách hứa trả vào ${promiseToPayDate.toLocaleDateString('vi-VN')}`
                : 'Khách đã nghe máy, sẽ cố gắng thanh toán'
              : 'Không nghe máy, để lại tin nhắn',
          promiseToPayDate,
          sentAt: reminderDate,
        },
      });
      createdCount++;
    }

    // 4. OVERDUE_REMINDER for loans past due (if applicable)
    if (loan.status === 'OVERDUE' && firstPayment.dueDate < new Date()) {
      const overdueDays = Math.floor(
        (new Date().getTime() - firstPayment.dueDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (loan.customer.phone) {
        await prisma.notificationLog.create({
          data: {
            type: NotificationType.OVERDUE_REMINDER,
            channel: NotificationChannel.SMS,
            status: NotificationStatus.SENT,
            loanId: loan.id,
            customerId: loan.customer.id,
            subject: 'Cảnh báo quá hạn thanh toán',
            message: `[Cầm đồ] CẢNH BÁO ${loan.customer.fullName}!
Khoản vay ${loan.loanCode} đã QUÁ HẠN ${overdueDays} ngày.
Số tiền cần thanh toán: ${amount} VND
Vui lòng thanh toán ngay để tránh thanh lý tài sản!`,
            recipientContact: loan.customer.phone,
            sentAt: new Date(),
          },
        });
        createdCount++;
      }

      // Phone call for overdue
      await prisma.notificationLog.create({
        data: {
          type: NotificationType.OVERDUE_REMINDER,
          channel: NotificationChannel.PHONE_CALL,
          status: NotificationStatus.ANSWERED,
          loanId: loan.id,
          customerId: loan.customer.id,
          subject: 'Gọi nhắc nợ quá hạn',
          message: `Gọi nhắc khách về khoản vay quá hạn ${loan.loanCode}`,
          recipientContact: loan.customer.phone,
          callDuration: Math.floor(Math.random() * 300) + 120,
          employeeId: loan.approvedBy || 'user_admin123',
          notes: 'Khách cam kết thanh toán trong tuần này',
          promiseToPayDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          sentAt: new Date(),
        },
      });
      createdCount++;
    }
  }

  console.log(`\n✅ Successfully created ${createdCount} notification logs`);
  console.log('   Types:');
  console.log('   - LOAN_APPROVED (SMS + Email)');
  console.log('   - INTEREST_REMINDER (SMS + Phone calls)');
  console.log('   - OVERDUE_REMINDER (for overdue loans)');
  console.log('   - PHONE_CALL logs with call duration and notes');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding notifications:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
