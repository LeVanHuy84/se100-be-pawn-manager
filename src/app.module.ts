import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Joi from 'joi';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './clerk/clerk-auth.guard';
import { EmployeeModule } from './modules/employee/employee.module';
import { LoanModule } from './modules/loan/loan.module';
import { CustomerModule } from './modules/customer/customer.module';
import { CollateralModule } from './modules/collateral/collateral.module';
import { ValuationModule } from './modules/valuation/valuation.module';
import { ContractModule } from './modules/contract/contract.module';
import { ConfigurationsModule } from './modules/configurations/configurations.module';
import { LoanSimulationsModule } from './modules/loan-simulations/loan-simulations.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RepaymentScheduleModule } from './modules/repayment-schedule/repayment-schedule.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { StoreModule } from './modules/store/store.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DisbursementModule } from './modules/disbursement/disbursement.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LocationModule } from './modules/location/location.module';
import { LoanTypeModule } from './modules/loan-type/loan-type.module';

@Module({
  imports: [
    EmployeeModule,
    CustomerModule,
    CollateralModule,
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
        // Email config (optional)
        SMTP_HOST: Joi.string().optional(),
        SMTP_PORT: Joi.number().optional(),
        SMTP_USER: Joi.string().optional(),
        SMTP_PASSWORD: Joi.string().optional(),
        SMTP_FROM: Joi.string().optional(),
        // Redis config for BullMQ
        REDIS_URL: Joi.string().required(),
      }),
    }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
        tls: {
          rejectUnauthorized: false,
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600, // 1 hour
          count: 1000, // Keep last 1000
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    }),
    ScheduleModule.forRoot(),
    LoanModule,
    ConfigurationsModule,
    LoanSimulationsModule,
    PaymentModule,
    RepaymentScheduleModule,
    AuditLogModule,
    CommunicationModule,
    StoreModule,
    ReportsModule,
    DisbursementModule,
    LocationModule,
    LoanTypeModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
