import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { RepaymentScheduleService } from './repayment-schedule.service';
import { RepaymentScheduleItemResponse } from './dto/response/reschedule-payment-item.response';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@Controller({
  version: '1',
})
@ApiErrorResponses()
export class RepaymentScheduleController {
  constructor(
    private readonly repaymentScheduleService: RepaymentScheduleService,
  ) {}

  @Get('loans/:loanId/repayment-schedule')
  async getLoanRepaymentSchedule(
    @Param('loanId', new ParseUUIDPipe()) loanId: string,
  ): Promise<RepaymentScheduleItemResponse[]> {
    return this.repaymentScheduleService.getLoanRepaymentSchedule(loanId);
  }

  @Get('repayment-schedules/:id')
  async getRepaymentScheduleItem(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RepaymentScheduleItemResponse> {
    return this.repaymentScheduleService.getRepaymentScheduleItem(id);
  }
}
