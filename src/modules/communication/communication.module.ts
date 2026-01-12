import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { ReminderProcessor } from './reminder.processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { SmsQueueProcessor } from './processors/sms-queue.processor';
import { EmailQueueProcessor } from './processors/email-queue.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      {
        name: 'sms-queue',
        defaultJobOptions: {
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed
          },
          removeOnFail: false, // Keep failed jobs for analysis
        },
      },
      {
        name: 'email-queue',
        defaultJobOptions: {
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed
          },
          removeOnFail: false, // Keep failed jobs for analysis
        },
      },
    ),
  ],
  controllers: [CommunicationController],
  providers: [
    CommunicationService,
    ReminderProcessor,
    EmailService,
    SmsService,
    SmsQueueProcessor,
    EmailQueueProcessor,
  ],
  exports: [CommunicationService, EmailService, SmsService, ReminderProcessor],
})
export class CommunicationModule {}
