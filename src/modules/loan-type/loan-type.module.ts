import { Module } from '@nestjs/common';
import { LoanTypeController } from './loan-type.controller';
import { LoanTypeService } from './loan-type.service';

@Module({
  controllers: [LoanTypeController],
  providers: [LoanTypeService],
})
export class LoanTypeModule {}
