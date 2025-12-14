import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepaymentItemStatus } from 'generated/prisma';

@Injectable()
export class MarkOverdueProcessor {
  private readonly logger = new Logger(MarkOverdueProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

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

        // ===== 2. Mark OVERDUE =====
        if (item.status === RepaymentItemStatus.PENDING) {
          await tx.repaymentScheduleDetail.update({
            where: { id: item.id },
            data: { status: RepaymentItemStatus.OVERDUE },
          });
          markedOverdue++;
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
        const penalty =
          principalOutstanding *
          (penaltyRateMonthly / 100) *
          (overdueDays / 30);

        if (penalty <= 0) continue;

        await tx.repaymentScheduleDetail.update({
          where: { id: item.id },
          data: {
            penaltyAmount: { increment: penalty },
            totalAmount: { increment: penalty }, // nếu bạn maintain totalAmount
            lastPenaltyAppliedAt: today,
          },
        });

        penaltyAccrued++;
      }
    });

    this.logger.log(
      `MarkOverdue done | marked=${markedOverdue} | penaltyAccrued=${penaltyAccrued}`,
    );
  }

  private toDateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private diffDays(from: Date, to: Date): number {
    const ms = this.toDateOnly(to).getTime() - this.toDateOnly(from).getTime();
    return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  }
}
