/*
  Warnings:

  - You are about to drop the `DisbursementLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DisbursementLog" DROP CONSTRAINT "DisbursementLog_loanId_fkey";

-- DropTable
DROP TABLE "public"."DisbursementLog";

-- CreateTable
CREATE TABLE "Disbursement" (
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

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_referenceCode_key" ON "Disbursement"("referenceCode");

-- CreateIndex
CREATE INDEX "Disbursement_loanId_idx" ON "Disbursement"("loanId");

-- CreateIndex
CREATE INDEX "Disbursement_disbursedAt_idx" ON "Disbursement"("disbursedAt");

-- CreateIndex
CREATE INDEX "Disbursement_disbursementMethod_idx" ON "Disbursement"("disbursementMethod");

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
