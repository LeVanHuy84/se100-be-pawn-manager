import { PrismaClient, DisbursementMethod } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding Disbursements...');

  // Lấy tất cả các khoản vay ACTIVE (đã được duyệt)
  const activeLoans = await prisma.loan.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      customer: {
        select: {
          fullName: true,
          nationalId: true,
        },
      },
    },
    orderBy: {
      approvedAt: 'asc',
    },
  });

  if (activeLoans.length === 0) {
    console.log('⚠️  No active loans found. Skipping disbursement seeding.');
    return;
  }

  console.log(`Found ${activeLoans.length} active loans`);

  let createdCount = 0;

  for (const loan of activeLoans) {
    // 80% CASH, 20% BANK_TRANSFER
    const disbursementMethod =
      Math.random() < 0.8
        ? DisbursementMethod.CASH
        : DisbursementMethod.BANK_TRANSFER;

    // Auto-generate reference code
    const year = new Date().getFullYear();
    const sequence = await prisma.disbursementSequence.upsert({
      where: { year },
      create: { year, value: 1 },
      update: { value: { increment: 1 } },
    });
    const referenceCode = `DSB-${year}-${sequence.value.toString().padStart(6, '0')}`;
    const idempotencyKey = `disbursement-approval-${loan.id}`;
    // Prepare disbursement data
    const disbursementData: any = {
      idempotencyKey: idempotencyKey, // Unique idempotency key for each disbursement
      loanId: loan.id,
      amount: loan.loanAmount,
      disbursementMethod,
      referenceCode,
      disbursedBy: loan.approvedBy || 'user_admin123',
      recipientName: loan.customer.fullName,
      recipientIdNumber: loan.customer.nationalId || undefined,
      notes: `Disbursement for approved loan ${loan.loanCode}`,
      disbursedAt: loan.approvedAt || loan.activatedAt || new Date(),
    };

    // Add method-specific fields
    if (disbursementMethod === DisbursementMethod.CASH) {
      // For cash: add witness
      disbursementData.witnessName = ['Nguyễn Văn X', 'Trần Thị Y', 'Lê Văn Z'][
        Math.floor(Math.random() * 3)
      ];
    } else {
      // For bank transfer: add bank details
      disbursementData.bankTransferRef = `FT${Date.now().toString().slice(-9)}`;
      disbursementData.bankAccountNumber = `0${Math.floor(
        Math.random() * 1000000000,
      )
        .toString()
        .padStart(9, '0')}`;
      disbursementData.bankName = [
        'Vietcombank',
        'VietinBank',
        'BIDV',
        'Techcombank',
        'MBBank',
        'ACB',
      ][Math.floor(Math.random() * 6)];
    }

    // Create disbursement
    await prisma.disbursement.create({
      data: disbursementData,
    });

    createdCount++;
    console.log(
      `  ✅ Created disbursement ${referenceCode} for loan ${loan.loanCode} (${disbursementMethod})`,
    );
  }

  console.log(`\n✅ Successfully created ${createdCount} disbursements`);
  console.log(
    `   - CASH: ${activeLoans.filter(() => Math.random() < 0.8).length} (approx.)`,
  );
  console.log(
    `   - BANK_TRANSFER: ${activeLoans.filter(() => Math.random() < 0.2).length} (approx.)`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Error seeding disbursements:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
