import { Module } from '@nestjs/common';
import { DisbursementService } from './disbursement.service';
import { DisbursementController } from './disbursement.controller';

@Module({
  controllers: [DisbursementController],
  providers: [DisbursementService],
  exports: [DisbursementService],
})
export class DisbursementModule {}
