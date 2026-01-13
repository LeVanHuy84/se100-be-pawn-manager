-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "disbursedAt" TIMESTAMP(3),
ADD COLUMN     "disbursedBy" TEXT,
ADD COLUMN     "disbursementMethod" "DisbursementMethod",
ADD COLUMN     "disbursementNote" TEXT;

-- CreateTable
CREATE TABLE "DisbursementSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "DisbursementSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "DisbursementLog" (
    "id" UUID NOT NULL,
    "loanId" UUID NOT NULL,
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

    CONSTRAINT "DisbursementLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisbursementLog_referenceCode_key" ON "DisbursementLog"("referenceCode");

-- CreateIndex
CREATE INDEX "DisbursementLog_loanId_idx" ON "DisbursementLog"("loanId");

-- CreateIndex
CREATE INDEX "DisbursementLog_disbursedAt_idx" ON "DisbursementLog"("disbursedAt");

-- CreateIndex
CREATE INDEX "DisbursementLog_disbursementMethod_idx" ON "DisbursementLog"("disbursementMethod");

-- AddForeignKey
ALTER TABLE "DisbursementLog" ADD CONSTRAINT "DisbursementLog_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
