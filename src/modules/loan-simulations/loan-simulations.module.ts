import { Module } from '@nestjs/common';
import { LoanSimulationsService } from './loan-simulations.service';
import { LoanSimulationsController } from './loan-simulations.controller';

@Module({
  controllers: [LoanSimulationsController],
  providers: [LoanSimulationsService],
})
export class LoanSimulationsModule {}
