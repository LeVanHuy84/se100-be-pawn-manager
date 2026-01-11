import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailJobData } from '../interfaces/notification-job.interface';
import { EmailService } from '../services/email.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('email-queue')
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const data = job.data;
    this.logger.log(`Processing Email job ${job.id} for loan ${data.loanId}`);

    try {
      // Send Email
      let result: { success: boolean; messageId?: string; error?: string };

      if (data.type === 'INTEREST_REMINDER') {
        result = await this.emailService.sendPaymentReminder({
          to: data.customerEmail!,
          customerName: data.customerName,
          dueDate: data.dueDate!,
          amount: data.amount!,
          periodNumber: data.periodNumber!,
        });
      } else {
        result = await this.emailService.sendOverdueNotification({
          to: data.customerEmail!,
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
          channel: 'EMAIL',
          status: result.success ? 'DELIVERED' : 'FAILED',
          loanId: data.loanId,
          customerId: data.customerId,
          subject: data.subject,
          message: data.message,
          recipientContact: data.customerEmail,
          sentAt: new Date(),
        },
      });

      if (!result.success) {
        throw new Error(`Email sending failed: ${result.error}`);
      }

      this.logger.log(`Email sent successfully for job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process Email job ${job.id}:`, error);
      throw error; // BullMQ will handle retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Email job ${job.id} failed:`, error);
  }
}
