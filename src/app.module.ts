import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './clerk/clerk-auth.guard';
import { EmployeeModule } from './modules/employee/employee.module';
import { CustomerModule } from './modules/customer/customer.module';
import { CollateralModule } from './modules/collateral/collateral.module';
import { DocumentModule } from './modules/document/document.module';
import { ValuationModule } from './modules/valuation/valuation.module';
import { ContractModule } from './modules/contract/contract.module';

@Module({
  imports: [
    EmployeeModule,
    CustomerModule,
    CollateralModule,
    DocumentModule,
    ValuationModule,
    ContractModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        CLERK_SECRET_KEY: Joi.string().required(),
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),
        GEMINI_API_KEY: Joi.string().required(),
      }),
    }),
  ],
  controllers: [],
  // providers: [
  //   {
  //     provide: APP_GUARD,
  //     useClass: ClerkAuthGuard,
  //   },
  // ],
})
export class AppModule {}
