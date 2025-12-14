import { Module } from '@nestjs/common';
import {
  CollateralController,
  CollateralLocationController,
  LiquidationController,
} from './collateral.controller';
import { CollateralService } from './collateral.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [
    CollateralController,
    CollateralLocationController,
    LiquidationController,
  ],
  providers: [CollateralService],
  exports: [CollateralService],
})
export class CollateralModule {}
