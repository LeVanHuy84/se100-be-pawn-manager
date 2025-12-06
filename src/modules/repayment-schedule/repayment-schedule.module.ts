import { Module } from '@nestjs/common';
import { RepaymentScheduleService } from './repayment-schedule.service';
import { RepaymentScheduleController } from './repayment-schedule.controller';

@Module({
  controllers: [RepaymentScheduleController],
  providers: [RepaymentScheduleService],
})
export class RepaymentScheduleModule {}
