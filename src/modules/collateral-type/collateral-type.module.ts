import { Module } from '@nestjs/common';
import { CollateralTypeController } from './collateral-type.controller';
import { CollateralTypeService } from './collateral-type.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CollateralTypeController],
  providers: [CollateralTypeService],
  exports: [CollateralTypeService],
})
export class CollateralTypeModule {}
