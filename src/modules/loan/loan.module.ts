import { Module } from '@nestjs/common';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanOrchestrator } from './loan.orchestrator';
import { LoanSimulationsModule } from '../loan-simulations/loan-simulations.module';

@Module({
  imports: [LoanSimulationsModule],
  controllers: [LoanController],
  providers: [LoanService, LoanOrchestrator],
})
export class LoanModule {}
