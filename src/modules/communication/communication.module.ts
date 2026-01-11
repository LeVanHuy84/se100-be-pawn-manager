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
      },
      {
        name: 'email-queue',
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
