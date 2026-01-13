import { Module } from '@nestjs/common';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanOrchestrator } from './loan.orchestrator';
import { LoanSimulationsModule } from '../loan-simulations/loan-simulations.module';
import { CommunicationModule } from '../communication/communication.module';
import { DisbursementModule } from '../disbursement/disbursement.module';
import { LoanCodeGenerate } from './loan-code.generate';

@Module({
  imports: [LoanSimulationsModule, CommunicationModule, DisbursementModule],
  controllers: [LoanController],
  providers: [LoanService, LoanOrchestrator, LoanCodeGenerate],
})
export class LoanModule {}
