import { Body, Controller, Post } from '@nestjs/common';
import { LoanSimulationsService } from './loan-simulations.service';
import { LoanSimulationRequestDto } from './dto/request/loan-simulation.request';
import { LoanSimulationResponse } from './dto/response/loan-simulation.response';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@Controller({
  version: '1',
  path: 'loan-simulations',
})
@ApiErrorResponses()
export class LoanSimulationsController {
  constructor(
    private readonly loanSimulationsService: LoanSimulationsService,
  ) {}

  @Public()
  @Post()
  async createSimulation(
    @Body() dto: LoanSimulationRequestDto,
  ): Promise<LoanSimulationResponse> {
    return this.loanSimulationsService.createSimulation(dto);
  }
}
