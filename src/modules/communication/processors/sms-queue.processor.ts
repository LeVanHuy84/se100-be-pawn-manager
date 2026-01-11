import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SmsJobData } from '../interfaces/notification-job.interface';
import { SmsService } from '../services/sms.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('sms-queue', {
  concurrency: 5, // Process max 5 SMS at a time to avoid rate limits
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // per 1 second
  },
})
export class SmsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsQueueProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<SmsJobData>): Promise<void> {
    const data = job.data;
    this.logger.log(`Processing SMS job ${job.id} for loan ${data.loanId}`);

    try {
      // Send SMS
      let result: { success: boolean; messageId?: string; error?: string };

      if (data.type === 'INTEREST_REMINDER') {
        result = await this.smsService.sendPaymentReminder({
          to: data.customerPhone!,
          customerName: data.customerName,
          dueDate: data.dueDate!,
          amount: data.amount!,
          periodNumber: data.periodNumber!,
        });
      } else {
        result = await this.smsService.sendOverdueNotification({
          to: data.customerPhone!,
          customerName: data.customerName,
          daysOverdue: data.daysOverdue!,
          amount: data.amount!,
          penalty: data.penalty!,
        });
      }

      // Update notification log
      await this.prisma.notificationLog.create({
        data: {
          type: data.type,
          channel: 'SMS',
          status: result.success ? 'DELIVERED' : 'FAILED',
          loanId: data.loanId,
          customerId: data.customerId,
          subject: data.type,
          message: data.message,
          recipientContact: data.customerPhone,
          sentAt: new Date(),
        },
      });

      if (!result.success) {
        throw new Error(`SMS sending failed: ${result.error}`);
      }

      this.logger.log(`SMS sent successfully for job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process SMS job ${job.id}:`, error);
      throw error; // BullMQ will handle retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`SMS job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`SMS job ${job.id} failed:`, error);
  }
}
