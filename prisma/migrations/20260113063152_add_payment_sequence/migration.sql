-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LOAN_APPROVED';

-- CreateTable
CREATE TABLE "PaymentSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "PaymentSequence_pkey" PRIMARY KEY ("year")
);
