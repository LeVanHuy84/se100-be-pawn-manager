import { Module } from '@nestjs/common';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanOrchestrator } from './loan.orchestrator';

@Module({
  controllers: [LoanController],
  providers: [LoanService, LoanOrchestrator],
})
export class LoanModule {}
