import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepaymentItemStatus, NotificationType } from 'generated/prisma';
import {
  SmsJobData,
  EmailJobData,
} from './interfaces/notification-job.interface';

interface PaymentWithCustomer {
  loanId: string;
  periodNumber: number;
  dueDate: Date;
  totalAmount: any;
  penaltyAmount?: any;
  loan: {
    customerId: string;
    customer: {
      id: string;
      fullName: string;
      phone: string | null;
      email: string | null;
    };
  };
}

/**
 * ReminderProcessor - Event-driven notification scheduler
 *
 * Features:
 * - Delayed scheduling with BullMQ (jobs run at specific future times)
 * - Public methods for on-demand notification triggering
 * - Generic notification scheduling to reduce duplication
 * - Easy to test and maintain
 */
@Injectable()
export class ReminderProcessor {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('sms-queue') private smsQueue: Queue<SmsJobData>,
    @InjectQueue('email-queue') private emailQueue: Queue<EmailJobData>,
  ) {}

  /**
   * Trigger overdue reminder for specific loan
   * Use case: After marking payment as overdue, send immediate notification
   */
  async triggerOverdueReminderForLoan(loanId: string): Promise<boolean> {
    const payment = await this.prisma.repaymentScheduleDetail.findFirst({
      where: {
        loanId,
        status: RepaymentItemStatus.OVERDUE,
      },
      orderBy: { dueDate: 'asc' },
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`No overdue payment found for loan ${loanId}`);
      return false;
    }

    const daysOverdue = Math.floor(
      (Date.now() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return this.scheduleNotificationForPayment(
      payment,
      NotificationType.OVERDUE_REMINDER,
      this.buildSoftOverdueMessage(payment, daysOverdue),
      'Nhắc nhở thanh toán quá hạn',
      2, // High priority
    );
  }

  /**
   * Schedule all upcoming reminders for a new loan
   * Use case: After loan approval, schedule all future reminders immediately
   * @returns Number of reminders scheduled
   */
  async scheduleAllRemindersForLoan(loanId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const payments = await this.prisma.repaymentScheduleDetail.findMany({
      where: {
        loanId,
        status: RepaymentItemStatus.PENDING,
        dueDate: { gte: today },
      },
      orderBy: { periodNumber: 'asc' },
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (payments.length === 0) {
      this.logger.warn(
        `No pending payments found for loan ${loanId} to schedule reminders`,
      );
      return 0;
    }

    let scheduled = 0;

    for (const payment of payments) {
      // Schedule 2 reminders:
      // 1. Reminder 3 days before due date at 9 AM
      const reminderDate = new Date(payment.dueDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      reminderDate.setHours(9, 0, 0, 0);

      // 2. Reminder on due date at 9 AM
      const dueDateReminder = new Date(payment.dueDate);
      dueDateReminder.setHours(9, 0, 0, 0);

      // Schedule 3-day-before reminder if in the future
      if (reminderDate > today) {
        const delayMs = reminderDate.getTime() - Date.now();
        const jobIdPrefix = `loan-${loanId}-period-${payment.periodNumber}-3day`;

        const success = await this.scheduleNotificationForPayment(
          payment,
          NotificationType.INTEREST_REMINDER,
          this.buildInterestReminderMessage(payment),
          'Nhắc nhở thanh toán',
          0,
          delayMs,
          jobIdPrefix,
        );

        if (success) {
          scheduled++;
          this.logger.log(
            `📅 Scheduled 3-day-before reminder for loan ${loanId}, period ${payment.periodNumber}, will run at ${reminderDate.toLocaleString('vi-VN')}`,
          );
        }
      }

      // Schedule due-date reminder if in the future
      if (dueDateReminder > today) {
        const delayMs = dueDateReminder.getTime() - Date.now();
        const jobIdPrefix = `loan-${loanId}-period-${payment.periodNumber}-duedate`;

        const success = await this.scheduleNotificationForPayment(
          payment,
          NotificationType.INTEREST_REMINDER,
          this.buildDueTodayMessage(payment),
          'Nhắc nhở thanh toán hôm nay',
          1, // Higher priority for due date
          delayMs,
          jobIdPrefix,
        );

        if (success) {
          scheduled++;
          this.logger.log(
            `🔔 Scheduled due-date reminder for loan ${loanId}, period ${payment.periodNumber}, will run at ${dueDateReminder.toLocaleString('vi-VN')}`,
          );
        }
      }
    }

    this.logger.log(
      `✅ Scheduled ${scheduled} reminders for ${payments.length} payments (loan ${loanId})`,
    );
    return scheduled;
  }

  /**
   * Send welcome notification after loan approval
   * Use case: Immediately after loan is approved
   */
  async sendWelcomeNotification(loanId: string): Promise<boolean> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
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
          where: { periodNumber: 1 },
          take: 1,
        },
      },
    });

    if (!loan || loan.repaymentSchedule.length === 0) {
      this.logger.warn(
        `Cannot send welcome notification for loan ${loanId}: loan or schedule not found`,
      );
      return false;
    }

    const firstPayment = loan.repaymentSchedule[0];
    const dueDate = firstPayment.dueDate.toISOString().slice(0, 10);
    const amount = Number(firstPayment.totalAmount);

    const message = `[Cầm đồ] Xin chào ${loan.customer.fullName}!
Khoản vay của bạn đã được duyệt.
Số tiền vay: ${Number(loan.loanAmount).toLocaleString('vi-VN')} VND
Kỳ đầu tiên đến hạn: ${dueDate}
Số tiền: ${amount.toLocaleString('vi-VN')} VND
Cảm ơn bạn đã tin tưởng!`;

    const jobData = {
      loanId: loan.id,
      customerId: loan.customer.id,
      customerName: loan.customer.fullName,
      customerPhone: loan.customer.phone,
      customerEmail: loan.customer.email,
      type: NotificationType.INTEREST_REMINDER,
      dueDate,
      amount,
      periodNumber: 1,
      message,
    };

    let scheduled = 0;

    // Send SMS if available
    if (loan.customer.phone) {
      await this.smsQueue.add('welcome', jobData, {
        priority: 3, // Highest priority
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
      scheduled++;
    }

    // Send Email if available
    if (loan.customer.email) {
      await this.emailQueue.add(
        'welcome',
        { ...jobData, subject: 'Thông báo khoản vay được duyệt' },
        {
          priority: 3,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
      scheduled++;
    }

    if (scheduled > 0) {
      this.logger.log(
        `✅ Welcome notification enqueued for loan ${loanId} (${scheduled} channels)`,
      );
    }

    return scheduled > 0;
  }

  /**
   * Send payment confirmation after successful payment
   * Use case: Immediately after payment is processed
   */
  async sendPaymentConfirmation(
    loanId: string,
    paymentId: string,
    amount: number,
    allocations: Array<{
      periodNumber: number;
      component: string;
      amount: number;
    }>,
  ): Promise<boolean> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!loan) {
      this.logger.warn(
        `Cannot send payment confirmation for loan ${loanId}: loan not found`,
      );
      return false;
    }

    // Build allocation summary
    const allocationSummary = allocations
      .map(
        (a) =>
          `  Kỳ ${a.periodNumber} - ${a.component}: ${a.amount.toLocaleString('vi-VN')} VNĐ`,
      )
      .join('\n');

    const message = `[Cầm đồ] Xin chào ${loan.customer.fullName}!
Thanh toán thành công!

Mã giao dịch: ${paymentId}
Số tiền: ${amount.toLocaleString('vi-VN')} VNĐ

Phân bổ thanh toán:\n${allocationSummary}

Cảm ơn bạn đã thanh toán!`;

    const jobData = {
      loanId: loan.id,
      customerId: loan.customer.id,
      customerName: loan.customer.fullName,
      customerPhone: loan.customer.phone,
      customerEmail: loan.customer.email,
      type: NotificationType.INTEREST_REMINDER,
      amount,
      message,
    };

    let scheduled = 0;

    // Send SMS if available
    if (loan.customer.phone) {
      await this.smsQueue.add('payment-confirmation', jobData, {
        priority: 2, // High priority
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
      scheduled++;
    }

    // Send Email if available
    if (loan.customer.email) {
      await this.emailQueue.add(
        'payment-confirmation',
        { ...jobData, subject: 'Xác nhận thanh toán' },
        {
          priority: 2,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
      scheduled++;
    }

    if (scheduled > 0) {
      this.logger.log(
        `✅ Payment confirmation enqueued for loan ${loanId}, payment ${paymentId} (${scheduled} channels)`,
      );
    }

    return scheduled > 0;
  }

  /**
   * Cancel scheduled reminders for paid periods
   * Use case: After payment received, cancel reminders for periods that are now PAID
   * @param loanId - Loan ID
   * @param periodNumbers - Array of period numbers that have been paid
   * @returns Number of jobs cancelled
   */
  async cancelRemindersForPayments(
    loanId: string,
    periodNumbers: number[],
  ): Promise<number> {
    if (periodNumbers.length === 0) return 0;

    let cancelled = 0;

    try {
      // Use jobId pattern to directly target jobs without fetching all delayed jobs
      const jobIdsToRemove: string[] = [];

      for (const periodNumber of periodNumbers) {
        // Each period has 2 reminder types (3day, duedate) × 2 channels (sms, email) = 4 jobs
        jobIdsToRemove.push(
          `loan-${loanId}-period-${periodNumber}-3day-sms`,
          `loan-${loanId}-period-${periodNumber}-3day-email`,
          `loan-${loanId}-period-${periodNumber}-duedate-sms`,
          `loan-${loanId}-period-${periodNumber}-duedate-email`,
        );
      }

      // Remove jobs by ID (much faster than fetching all delayed jobs)
      const removePromises = jobIdsToRemove.map(async (jobId) => {
        try {
          // Try SMS queue first
          const smsJob = await this.smsQueue.getJob(jobId);
          if (smsJob) {
            await smsJob.remove();
            cancelled++;
            return;
          }
          // Then try Email queue
          const emailJob = await this.emailQueue.getJob(jobId);
          if (emailJob) {
            await emailJob.remove();
            cancelled++;
          }
        } catch (error) {
          // Job might not exist or already completed - this is OK
          this.logger.debug(
            `No scheduled job found with ID ${jobId} to remove: ${error.message}`,
          );
        }
      });

      await Promise.all(removePromises);

      if (cancelled > 0) {
        this.logger.log(
          `🗑️  Cancelled ${cancelled} scheduled reminders for loan ${loanId}, periods: ${periodNumbers.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to cancel reminders for loan ${loanId}:`,
        error,
      );
    }

    return cancelled;
  }

  /**
   * Generic notification scheduler - reduces duplication
   * Enqueues both SMS and Email if contact info exists
   *
   * @param delayMs - Delay in milliseconds before job execution (for future scheduling)
   * @returns true if at least one notification was scheduled
   */
  private async scheduleNotificationForPayment(
    payment: PaymentWithCustomer,
    type: NotificationType,
    message: string,
    subject: string,
    priority: number = 0,
    delayMs?: number,
    jobIdPrefix?: string,
  ): Promise<boolean> {
    const { loan } = payment;
    let scheduled = 0;

    // Defensive check: verify payment is still pending before scheduling
    // This handles race conditions where payment might be paid between query and scheduling
    if (delayMs) {
      const currentStatus =
        await this.prisma.repaymentScheduleDetail.findUnique({
          where: { id: payment.loanId + '_' + payment.periodNumber },
          select: { status: true },
        });

      if (currentStatus?.status === RepaymentItemStatus.PAID) {
        this.logger.log(
          `⏭️  Skipping reminder for loan ${payment.loanId} period ${payment.periodNumber} - already PAID`,
        );
        return false;
      }
    }

    const baseJobData = {
      loanId: payment.loanId,
      customerId: loan.customerId,
      customerName: loan.customer.fullName,
      customerPhone: loan.customer.phone,
      customerEmail: loan.customer.email,
      type,
      dueDate: payment.dueDate.toISOString().slice(0, 10),
      amount: Number(payment.totalAmount),
      periodNumber: payment.periodNumber,
      message,
    };

    // SMS Queue
    if (loan.customer.phone) {
      await this.smsQueue.add('reminder', baseJobData, {
        jobId: jobIdPrefix ? `${jobIdPrefix}-sms` : undefined,
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        ...(delayMs && { delay: delayMs }), // Schedule for future if delay specified
      });
      scheduled++;
    }

    // Email Queue
    if (loan.customer.email) {
      await this.emailQueue.add(
        'reminder',
        {
          ...baseJobData,
          subject,
        },
        {
          jobId: jobIdPrefix ? `${jobIdPrefix}-email` : undefined,
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          ...(delayMs && { delay: delayMs }), // Schedule for future if delay specified
        },
      );
      scheduled++;
    }

    return scheduled > 0;
  }

  // ============================================================
  // MESSAGE BUILDERS - Format notification messages
  // ============================================================

  private buildInterestReminderMessage(payment: PaymentWithCustomer): string {
    const dueDate = payment.dueDate.toLocaleDateString('vi-VN');
    const amount = Number(payment.totalAmount).toLocaleString('vi-VN');
    return `Kính chào ${payment.loan.customer.fullName}, bạn có khoản thanh toán kỳ ${payment.periodNumber} đến hạn vào ${dueDate} với số tiền ${amount} VNĐ. Vui lòng thanh toán đúng hạn.`;
  }

  private buildDueTodayMessage(payment: PaymentWithCustomer): string {
    const amount = Number(payment.totalAmount).toLocaleString('vi-VN');
    return `Kính chào ${payment.loan.customer.fullName}, khoản thanh toán kỳ ${payment.periodNumber} đến hạn hôm nay với số tiền ${amount} VNĐ. Vui lòng thanh toán để tránh phí phạt.`;
  }

  private buildSoftOverdueMessage(
    payment: PaymentWithCustomer,
    daysOverdue: number,
  ): string {
    const amount = Number(payment.totalAmount).toLocaleString('vi-VN');
    const penalty = payment.penaltyAmount
      ? Number(payment.penaltyAmount).toLocaleString('vi-VN')
      : '0';
    return `Kính chào ${payment.loan.customer.fullName}, khoản thanh toán kỳ ${payment.periodNumber} đã quá hạn ${daysOverdue} ngày. Số tiền cần thanh toán: ${amount} VNĐ + phí phạt ${penalty} VNĐ. Vui lòng thanh toán sớm.`;
  }
}
