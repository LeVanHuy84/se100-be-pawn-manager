import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepaymentItemStatus } from 'generated/prisma';
import { ReminderProcessor } from '../communication/reminder.processor';

@Injectable()
export class MarkOverdueProcessor {
  private readonly logger = new Logger(MarkOverdueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderProcessor: ReminderProcessor,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async run() {
    const today = this.toDateOnly(new Date());

    const candidates = await this.prisma.repaymentScheduleDetail.findMany({
      where: {
        status: {
          in: [RepaymentItemStatus.PENDING, RepaymentItemStatus.OVERDUE],
        },
        dueDate: { lt: today },
      },
      include: {
        loan: {
          select: {
            id: true,
            status: true,
            latePaymentPenaltyRate: true, // %/month (snapshot)
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { periodNumber: 'asc' }],
    });

    if (candidates.length === 0) {
      this.logger.log('No overdue candidates');
      return;
    }

    let markedOverdue = 0;
    let penaltyAccrued = 0;
    const affectedLoanIds = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      for (const item of candidates) {
        // ===== 1. Tính outstanding =====
        const principalOutstanding =
          Number(item.principalAmount) - Number(item.paidPrincipal ?? 0);
        const interestOutstanding =
          Number(item.interestAmount) - Number(item.paidInterest ?? 0);
        const feeOutstanding =
          Number(item.feeAmount) - Number(item.paidFee ?? 0);
        const penaltyOutstanding =
          Number(item.penaltyAmount ?? 0) - Number(item.paidPenalty ?? 0);

        const stillOutstanding =
          principalOutstanding > 0 ||
          interestOutstanding > 0 ||
          feeOutstanding > 0 ||
          penaltyOutstanding > 0;

        // Đã trả đủ hết → không làm gì
        if (!stillOutstanding) continue;

        // Track affected loans
        affectedLoanIds.add(item.loanId);

        // ===== 2. Mark OVERDUE =====
        if (item.status === RepaymentItemStatus.PENDING) {
          await tx.repaymentScheduleDetail.update({
            where: { id: item.id },
            data: { status: RepaymentItemStatus.OVERDUE },
          });
          markedOverdue++;

          // Log to AuditLog
          await tx.auditLog.create({
            data: {
              action: 'SYSTEM_MARK_OVERDUE',
              entityId: item.id,
              entityType: 'REPAYMENT_SCHEDULE',
              actorId: null, // System action
              description: `Auto-marked as OVERDUE (Due: ${item.dueDate.toISOString().slice(0, 10)})`,
              oldValue: { status: 'PENDING' },
              newValue: { status: 'OVERDUE' },
            },
          });
        }

        // ===== 3. Cộng penalty interest =====
        // chỉ phạt trên GỐC quá hạn
        if (principalOutstanding <= 0) continue;

        const penaltyRateMonthly = Number(
          item.loan.latePaymentPenaltyRate ?? 0,
        );
        if (penaltyRateMonthly <= 0) continue;

        const lastAppliedDate = item.lastPenaltyAppliedAt
          ? this.toDateOnly(item.lastPenaltyAppliedAt)
          : this.toDateOnly(item.dueDate);

        const overdueDays = this.diffDays(lastAppliedDate, today);
        if (overdueDays <= 0) continue;

        // penalty = overduePrincipal * rate% * days/30
        const penalty = Math.round(
          principalOutstanding *
            (penaltyRateMonthly / 100) *
            (overdueDays / 30),
        );

        if (penalty <= 0) continue;

        const oldPenaltyAmount = Number(item.penaltyAmount ?? 0);
        const newPenaltyAmount = oldPenaltyAmount + penalty;

        await tx.repaymentScheduleDetail.update({
          where: { id: item.id },
          data: {
            penaltyAmount: newPenaltyAmount,
            totalAmount: { increment: penalty }, // nếu bạn maintain totalAmount
            lastPenaltyAppliedAt: today,
          },
        });

        // Log penalty to AuditLog
        await tx.auditLog.create({
          data: {
            action: 'SYSTEM_PENALTY',
            entityId: item.id,
            entityType: 'REPAYMENT_SCHEDULE',
            actorId: null, // System action
            description: `Auto-applied penalty: ${penalty.toLocaleString('vi-VN')} VND (${overdueDays} days overdue on principal ${Math.round(principalOutstanding).toLocaleString('vi-VN')} VND)`,
            oldValue: { penaltyAmount: oldPenaltyAmount },
            newValue: { penaltyAmount: newPenaltyAmount },
          },
        });

        penaltyAccrued++;
      }

      // ===== 4. Update Loan Status to OVERDUE (Fix Zombie Loan) =====
      // If loan has any OVERDUE items and loan status is still ACTIVE, mark loan as OVERDUE
      for (const loanId of affectedLoanIds) {
        const loan = await tx.loan.findUnique({
          where: { id: loanId },
          select: { status: true },
        });

        if (loan && loan.status === 'ACTIVE') {
          await tx.loan.update({
            where: { id: loanId },
            data: { status: 'OVERDUE' },
          });

          // Log loan status change
          await tx.auditLog.create({
            data: {
              action: 'SYSTEM_LOAN_STATUS_CHANGE',
              entityId: loanId,
              entityType: 'LOAN',
              actorId: null, // System action
              description:
                'Auto-changed loan status to OVERDUE due to overdue repayment items',
              oldValue: { status: 'ACTIVE' },
              newValue: { status: 'OVERDUE' },
            },
          });

          this.logger.log(`Updated loan ${loanId} status to OVERDUE`);
        }
      }
    });

    this.logger.log(
      `MarkOverdue done | marked=${markedOverdue} | penaltyAccrued=${penaltyAccrued} | loansAffected=${affectedLoanIds.size}`,
    );

    // Send overdue notifications for all affected loans
    if (affectedLoanIds.size > 0) {
      this.logger.log(
        `Sending overdue notifications for ${affectedLoanIds.size} loans...`,
      );
      let notificationsSent = 0;

      for (const loanId of affectedLoanIds) {
        try {
          const success =
            await this.reminderProcessor.triggerOverdueReminderForLoan(loanId);
          if (success) notificationsSent++;
        } catch (error) {
          this.logger.error(
            `Failed to send overdue notification for loan ${loanId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `✅ Sent ${notificationsSent}/${affectedLoanIds.size} overdue notifications`,
      );
    }
  }

  private toDateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private diffDays(from: Date, to: Date): number {
    const ms = this.toDateOnly(to).getTime() - this.toDateOnly(from).getTime();
    return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  }
}
