// prisma/seed-loan-product-types.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding LoanProductType...');

  const types = [
    // =========================
    // VEHICLE – cầm xe
    // =========================
    {
      name: 'VEHICLE',
      description: 'Generic vehicle collateral loans (bike, car, etc.)',
      interestRateMonthly: 1.6, // %
      mgmtFeeRateMonthly: 1.4, // %
      custodyFeeRateMonthly: 2.0, // %
    },
    {
      name: 'VEHICLE_BIKE_STANDARD',
      description: 'Standard motorbike collateral loans',
      interestRateMonthly: 1.8,
      mgmtFeeRateMonthly: 1.2,
      custodyFeeRateMonthly: 2.0,
    },
    {
      name: 'VEHICLE_BIKE_PREMIUM',
      description: 'Premium motorbike loans for newer / high-value bikes',
      interestRateMonthly: 1.4,
      mgmtFeeRateMonthly: 1.0,
      custodyFeeRateMonthly: 1.8,
    },
    {
      name: 'VEHICLE_CAR_STANDARD',
      description: 'Standard car collateral loans',
      interestRateMonthly: 1.3,
      mgmtFeeRateMonthly: 1.0,
      custodyFeeRateMonthly: 1.5,
    },

    // =========================
    // GOLD – cầm vàng / trang sức
    // =========================
    {
      name: 'GOLD_SHORT_TERM',
      description: 'Short-term gold collateral loans (<= 3 months)',
      interestRateMonthly: 1.5,
      mgmtFeeRateMonthly: 0.8,
      custodyFeeRateMonthly: 1.2,
    },
    {
      name: 'GOLD_LONG_TERM',
      description: 'Long-term gold collateral loans (> 3 months)',
      interestRateMonthly: 1.8,
      mgmtFeeRateMonthly: 1.0,
      custodyFeeRateMonthly: 1.5,
    },

    // =========================
    // SALARY – vay theo lương (không tài sản)
    // =========================
    {
      name: 'SALARY',
      description: 'Standard salary-based personal loans (no collateral)',
      interestRateMonthly: 1.2, // %
      mgmtFeeRateMonthly: 1.0, // %
      custodyFeeRateMonthly: 0.0,
    },
    {
      name: 'SALARY_JUNIOR',
      description: 'Salary loan for junior employees / freshers',
      interestRateMonthly: 1.5,
      mgmtFeeRateMonthly: 1.2,
      custodyFeeRateMonthly: 0.0,
    },
    {
      name: 'SALARY_SENIOR',
      description: 'Salary loan for senior / stable-income employees',
      interestRateMonthly: 1.0,
      mgmtFeeRateMonthly: 0.8,
      custodyFeeRateMonthly: 0.0,
    },

    // =========================
    // ELECTRONICS – cầm điện thoại / laptop
    // =========================
    {
      name: 'ELECTRONICS_PHONE',
      description: 'Collateral loans for smartphones',
      interestRateMonthly: 2.2,
      mgmtFeeRateMonthly: 1.5,
      custodyFeeRateMonthly: 2.0,
    },
    {
      name: 'ELECTRONICS_LAPTOP',
      description: 'Collateral loans for laptops',
      interestRateMonthly: 2.0,
      mgmtFeeRateMonthly: 1.3,
      custodyFeeRateMonthly: 1.8,
    },

    // =========================
    // HOME_APPLIANCE – đồ gia dụng
    // =========================
    {
      name: 'HOME_APPLIANCE',
      description: 'Collateral loans for home appliances (TV, fridge, etc.)',
      interestRateMonthly: 2.1,
      mgmtFeeRateMonthly: 1.4,
      custodyFeeRateMonthly: 1.8,
    },

    // =========================
    // SME / BUSINESS – hộ kinh doanh
    // =========================
    {
      name: 'SME_MICRO',
      description: 'Micro business working-capital loans',
      interestRateMonthly: 1.9,
      mgmtFeeRateMonthly: 1.5,
      custodyFeeRateMonthly: 0.0,
    },
    {
      name: 'SME_SMALL',
      description: 'Small business working-capital loans (secured)',
      interestRateMonthly: 1.6,
      mgmtFeeRateMonthly: 1.2,
      custodyFeeRateMonthly: 0.5,
    },
  ];

  for (const t of types) {
    await prisma.loanProductType.upsert({
      where: { name: t.name },
      update: {
        description: t.description,
        interestRateMonthly: t.interestRateMonthly,
        mgmtFeeRateMonthly: t.mgmtFeeRateMonthly,
        custodyFeeRateMonthly: t.custodyFeeRateMonthly,
      },
      create: t,
    });
  }

  console.log('✅ LoanProductType seeded');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
