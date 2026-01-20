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
    const overdueThresholdDays = 3; // mark loan OVERDUE after earliest overdue period passes this threshold

    const candidates = await this.prisma.repaymentScheduleDetail.findMany({
      where: {
        status: {
          in: [RepaymentItemStatus.PENDING, RepaymentItemStatus.OVERDUE],
        },
        dueDate: { lt: today },
        loan: {
          status: {
            in: ['ACTIVE', 'OVERDUE'],
          },
        },
      },
      include: {
        loan: {
          select: {
            id: true,
            loanCode: true,
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
        const principalOutstanding = Math.ceil(
          Number(item.principalAmount) - Number(item.paidPrincipal ?? 0),
        );
        const interestOutstanding = Math.ceil(
          Number(item.interestAmount) - Number(item.paidInterest ?? 0),
        );
        const feeOutstanding = Math.ceil(
          Number(item.feeAmount) - Number(item.paidFee ?? 0),
        );
        const penaltyOutstanding = Math.ceil(
          Number(item.penaltyAmount ?? 0) - Number(item.paidPenalty ?? 0),
        );

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
              entityName: `Kì ${item.periodNumber} - ${item.loan.loanCode}`,
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

        // penalty = overduePrincipal * rate * days / 30
        // e.g: 1,000,000 * 0.02 * 5 days / 30 = 3,333 VND
        // Note: rate is already in decimal form (0.02 for 2%)
        const penalty = Math.ceil(
          (principalOutstanding * penaltyRateMonthly * overdueDays) / 30,
        );

        if (penalty <= 0) continue;

        const oldPenaltyAmount = Number(item.penaltyAmount ?? 0);
        const newPenaltyAmount = oldPenaltyAmount + penalty;
        const newTotalAmount =
          Number(item.principalAmount) +
          Number(item.interestAmount) +
          Number(item.feeAmount) +
          newPenaltyAmount;

        await tx.repaymentScheduleDetail.update({
          where: { id: item.id },
          data: {
            penaltyAmount: newPenaltyAmount,
            totalAmount: newTotalAmount, // Calculate instead of increment
            lastPenaltyAppliedAt: today,
          },
        });

        // Log penalty to AuditLog
        await tx.auditLog.create({
          data: {
            action: 'SYSTEM_PENALTY',
            entityId: item.id,
            entityType: 'REPAYMENT_SCHEDULE',
            entityName: `Kì ${item.periodNumber} - ${item.loan.loanCode}`,
            actorId: null, // System action
            description: `Auto-applied penalty: ${penalty.toLocaleString('vi-VN')} VND (${overdueDays} days overdue on principal ${Math.ceil(principalOutstanding).toLocaleString('vi-VN')} VND)`,
            oldValue: { penaltyAmount: oldPenaltyAmount },
            newValue: { penaltyAmount: newPenaltyAmount },
          },
        });

        penaltyAccrued++;
      }

      // ===== 4. Update Loan Status to OVERDUE =====
      // Batch query all affected loans and their earliest overdue periods
      const loansToCheck = await tx.loan.findMany({
        where: {
          id: { in: Array.from(affectedLoanIds) },
          status: 'ACTIVE',
        },
        select: { id: true, loanCode: true, status: true },
      });

      if (loansToCheck.length > 0) {
        // Batch query earliest overdue periods for all loans
        const earliestOverdues = await tx.repaymentScheduleDetail.groupBy({
          by: ['loanId'],
          where: {
            loanId: { in: loansToCheck.map((l) => l.id) },
            status: RepaymentItemStatus.OVERDUE,
          },
          _min: { dueDate: true },
        });

        const earliestMap = new Map(
          earliestOverdues.map((e) => [e.loanId, e._min.dueDate]),
        );

        for (const loan of loansToCheck) {
          const earliestDueDate = earliestMap.get(loan.id);
          if (!earliestDueDate) continue;

          const daysOverdueFromEarliest = this.diffDays(
            this.toDateOnly(earliestDueDate),
            today,
          );

          // Only mark OVERDUE if past threshold from earliest overdue period
          if (daysOverdueFromEarliest >= overdueThresholdDays) {
            await tx.loan.update({
              where: { id: loan.id },
              data: { status: 'OVERDUE' },
            });

            // Log loan status change
            await tx.auditLog.create({
              data: {
                action: 'SYSTEM_LOAN_STATUS_CHANGE',
                entityId: loan.id,
                entityType: 'LOAN',
                entityName: loan.loanCode,
                actorId: null, // System action
                description: `Auto-changed loan status to OVERDUE (${daysOverdueFromEarliest} days past earliest overdue period)`,
                oldValue: { status: 'ACTIVE' },
                newValue: { status: 'OVERDUE' },
              },
            });

            this.logger.log(
              `Updated loan ${loan.id} status to OVERDUE (${daysOverdueFromEarliest} days overdue from earliest period)`,
            );
          }
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
