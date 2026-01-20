import { Module } from '@nestjs/common';
import { ValuationController } from './valuation.controller';
import { ValuationService } from './valuation.service';
import { GeminiService } from './gemini.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ValuationController],
  providers: [ValuationService, GeminiService],
  exports: [ValuationService],
})
export class ValuationModule {}
