import { Prisma } from 'generated/prisma';

export class LoanCodeGenerate {
  async generateLoanCode(tx: Prisma.TransactionClient) {
    const year = new Date().getFullYear();

    const seq = await tx.loanSequence.upsert({
      where: { year },
      update: { value: { increment: 1 } },
      create: { year, value: 1 },
    });

    const runningNumber = seq.value.toString().padStart(6, '0');

    return `LN-${year}-${runningNumber}`;
  }
}
