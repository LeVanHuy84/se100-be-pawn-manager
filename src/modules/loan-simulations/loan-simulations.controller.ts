import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoanSimulationsService } from './loan-simulations.service';
import { LoanSimulationRequestDto } from './dto/request/loan-simulation.request';
import { LoanSimulationResponse } from './dto/response/loan-simulation.response';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Loan Simulations')
@Controller({
  version: '1',
  path: 'loan-simulations',
})
export class LoanSimulationsController {
  constructor(
    private readonly loanSimulationsService: LoanSimulationsService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Simulate loan repayment schedule',
    description:
      'Calculate projected repayment schedule before creating actual loan. ' +
      'Supports two repayment methods: EQUAL_INSTALLMENT (declining balance) and INTEREST_ONLY (balloon payment). ' +
      'This is a public endpoint to allow customers to preview loan terms without authentication.',
  })
  @ApiBody({
    type: LoanSimulationRequestDto,
    examples: {
      equalInstallment: {
        summary: 'Equal Installment (Declining Balance)',
        description: 'Principal paid evenly each month, interest decreases',
        value: {
          loanAmount: 50000000,
          totalFeeRate: 0.52,
          loanTypeId: 1,
          repaymentMethod: 'EQUAL_INSTALLMENT',
        },
      },
      interestOnly: {
        summary: 'Interest Only (Balloon Payment)',
        description:
          'Pay only interest each month, full principal due at maturity',
        value: {
          loanAmount: 30000000,
          totalFeeRate: 0.32,
          loanTypeId: 1,
          repaymentMethod: 'INTEREST_ONLY',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Simulation created successfully',
    type: LoanSimulationResponse,
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid loan type ID or missing system parameters',
  })
  async createSimulation(
    @Body() dto: LoanSimulationRequestDto,
  ): Promise<LoanSimulationResponse> {
    return this.loanSimulationsService.createSimulation(dto);
  }
}
