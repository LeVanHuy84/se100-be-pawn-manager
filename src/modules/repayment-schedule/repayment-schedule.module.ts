import { Module } from '@nestjs/common';
import { RepaymentScheduleService } from './repayment-schedule.service';
import { RepaymentScheduleController } from './repayment-schedule.controller';
import { MarkOverdueProcessor } from './mark-overdue.processor';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [CommunicationModule],
  controllers: [RepaymentScheduleController],
  providers: [RepaymentScheduleService, MarkOverdueProcessor],
})
export class RepaymentScheduleModule {}
