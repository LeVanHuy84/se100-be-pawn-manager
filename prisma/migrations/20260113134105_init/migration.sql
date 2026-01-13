-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('REGULAR', 'VIP');

-- CreateEnum
CREATE TYPE "RepaymentMethod" AS ENUM ('EQUAL_INSTALLMENT', 'INTEREST_ONLY');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'REJECTED', 'ACTIVE', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "RepaymentItemStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PERIODIC', 'EARLY', 'PAYOFF', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentComponent" AS ENUM ('PRINCIPAL', 'INTEREST', 'LATE_FEE', 'PENALTY', 'SERVICE_FEE');

-- CreateEnum
CREATE TYPE "CollateralStatus" AS ENUM ('PROPOSED', 'PLEDGED', 'STORED', 'RELEASED', 'REJECTED', 'LIQUIDATING', 'SOLD');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DisbursementMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('LOAN', 'LOAN_PAYMENT', 'REPAYMENT_SCHEDULE', 'COLLATERAL', 'CUSTOMER', 'DISBURSEMENT');

-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('INTEREST', 'LATE_FEE', 'SERVICE_FEE', 'LIQUIDATION_EXCESS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOAN_APPROVED', 'INTEREST_REMINDER', 'OVERDUE_REMINDER', 'LIQUIDATION_WARNING', 'PAYMENT_CONFIRMATION');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'PHONE_CALL', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'ANSWERED', 'NO_ANSWER', 'PROMISE_TO_PAY');

-- CreateTable
CREATE TABLE "LoanType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMonths" INTEGER NOT NULL,
    "interestRateMonthly" DECIMAL(7,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "nationalId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "customerType" "CustomerType" NOT NULL,
    "monthlyIncome" DECIMAL(65,30),
    "creditScore" INTEGER,
    "images" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "LoanSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "PaymentSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "PaymentSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "DisbursementSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "DisbursementSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" UUID NOT NULL,
    "loanCode" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "loanAmount" DECIMAL(65,30) NOT NULL,
    "repaymentMethod" "RepaymentMethod" NOT NULL,
    "loanTypeId" INTEGER NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "appliedInterestRate" DECIMAL(65,30) NOT NULL,
    "latePaymentPenaltyRate" DECIMAL(7,4) NOT NULL,
    "totalInterest" DECIMAL(65,30) NOT NULL,
    "totalFees" DECIMAL(65,30) NOT NULL,
    "totalRepayment" DECIMAL(65,30) NOT NULL,
    "monthlyPayment" DECIMAL(65,30) NOT NULL,
    "startDate" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "remainingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "disbursedAt" TIMESTAMP(3),
    "disbursedBy" TEXT,
    "disbursementMethod" "DisbursementMethod",
    "disbursementNote" TEXT,
    "notes" TEXT,
    "storeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentScheduleDetail" (
    "id" UUID NOT NULL,
    "loanId" UUID NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "beginningBalance" DECIMAL(65,30) NOT NULL,
    "principalAmount" DECIMAL(65,30) NOT NULL,
    "interestAmount" DECIMAL(65,30) NOT NULL,
    "feeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "status" "RepaymentItemStatus" NOT NULL DEFAULT 'PENDING',
    "paidPrincipal" DECIMAL(65,30) DEFAULT 0,
    "paidInterest" DECIMAL(65,30) DEFAULT 0,
    "paidFee" DECIMAL(65,30) DEFAULT 0,
    "paidPenalty" DECIMAL(65,30) DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "lastPenaltyAppliedAt" DATE,

    CONSTRAINT "RepaymentScheduleDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT,
    "loanId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceCode" TEXT,
    "recorderEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "componentType" "PaymentComponent" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "note" TEXT,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT,
    "loanId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "disbursementMethod" "DisbursementMethod" NOT NULL,
    "disbursedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceCode" TEXT,
    "disbursedBy" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientIdNumber" TEXT,
    "witnessName" TEXT,
    "notes" TEXT,
    "bankTransferRef" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollateralType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "custodyFeeRateMonthly" DECIMAL(7,4) NOT NULL DEFAULT 0,

    CONSTRAINT "CollateralType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "storeInfo" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collateral" (
    "id" UUID NOT NULL,
    "collateralTypeId" INTEGER NOT NULL,
    "ownerName" TEXT NOT NULL,
    "collateralInfo" JSONB NOT NULL,
    "status" "CollateralStatus" NOT NULL DEFAULT 'PROPOSED',
    "loanId" UUID,
    "storageLocation" TEXT,
    "receivedDate" DATE,
    "appraisedValue" DECIMAL(65,30),
    "ltvRatio" DECIMAL(65,30),
    "appraisalDate" TIMESTAMP(3),
    "appraisalNotes" TEXT,
    "images" JSONB NOT NULL,
    "sellPrice" DECIMAL(65,30),
    "sellDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" UUID,

    CONSTRAINT "Collateral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemParameter" (
    "id" SERIAL NOT NULL,
    "paramGroup" TEXT,
    "paramKey" TEXT NOT NULL,
    "paramValue" TEXT NOT NULL,
    "dataType" TEXT DEFAULT 'STRING',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityName" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueLedger" (
    "id" UUID NOT NULL,
    "type" "RevenueType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "refId" TEXT NOT NULL,
    "storeId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "loanId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "recipientContact" TEXT,
    "callDuration" INTEGER,
    "employeeId" TEXT,
    "notes" TEXT,
    "promiseToPayDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanType_name_key" ON "LoanType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_nationalId_key" ON "Customer"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanCode_key" ON "Loan"("loanCode");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_idempotencyKey_key" ON "LoanPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LoanPayment_storeId_idx" ON "LoanPayment"("storeId");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_idx" ON "LoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanPayment_paidAt_idx" ON "LoanPayment"("paidAt");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_idempotencyKey_key" ON "Disbursement"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_referenceCode_key" ON "Disbursement"("referenceCode");

-- CreateIndex
CREATE INDEX "Disbursement_loanId_idx" ON "Disbursement"("loanId");

-- CreateIndex
CREATE INDEX "Disbursement_storeId_idx" ON "Disbursement"("storeId");

-- CreateIndex
CREATE INDEX "Disbursement_disbursedAt_idx" ON "Disbursement"("disbursedAt");

-- CreateIndex
CREATE INDEX "Disbursement_disbursementMethod_idx" ON "Disbursement"("disbursementMethod");

-- CreateIndex
CREATE UNIQUE INDEX "SystemParameter_paramGroup_paramKey_key" ON "SystemParameter"("paramGroup", "paramKey");

-- CreateIndex
CREATE INDEX "RevenueLedger_storeId_idx" ON "RevenueLedger"("storeId");

-- CreateIndex
CREATE INDEX "RevenueLedger_type_idx" ON "RevenueLedger"("type");

-- CreateIndex
CREATE INDEX "RevenueLedger_recordedAt_idx" ON "RevenueLedger"("recordedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_loanId_type_idx" ON "NotificationLog"("loanId", "type");

-- CreateIndex
CREATE INDEX "NotificationLog_customerId_idx" ON "NotificationLog"("customerId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_loanTypeId_fkey" FOREIGN KEY ("loanTypeId") REFERENCES "LoanType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentScheduleDetail" ADD CONSTRAINT "RepaymentScheduleDetail_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "LoanPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collateral" ADD CONSTRAINT "Collateral_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collateral" ADD CONSTRAINT "Collateral_collateralTypeId_fkey" FOREIGN KEY ("collateralTypeId") REFERENCES "CollateralType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collateral" ADD CONSTRAINT "Collateral_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueLedger" ADD CONSTRAINT "RevenueLedger_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
