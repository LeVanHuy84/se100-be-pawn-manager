import { PrismaService } from 'src/prisma/prisma.service';

const prisma = new PrismaService();

async function main() {
  console.log('🌱 Seeding LoanType...');

  const types = [
    // =========================
    // VEHICLE – cầm xe
    // =========================
    {
      name: 'VEHICLE_BIKE_STANDARD_6M',
      description: 'Standard motorbike collateral loans - 6 months',
      durationMonths: 6,
      interestRateMonthly: 1.8, // %
    },
    {
      name: 'VEHICLE_BIKE_STANDARD_12M',
      description: 'Standard motorbike collateral loans - 12 months',
      durationMonths: 12,
      interestRateMonthly: 1.8,
    },
    {
      name: 'VEHICLE_BIKE_PREMIUM_6M',
      description:
        'Premium motorbike loans for newer/high-value bikes - 6 months',
      durationMonths: 6,
      interestRateMonthly: 1.4,
    },
    {
      name: 'VEHICLE_CAR_STANDARD_12M',
      description: 'Standard car collateral loans - 12 months',
      durationMonths: 12,
      interestRateMonthly: 1.3,
    },
    {
      name: 'VEHICLE_CAR_PREMIUM_12M',
      description: 'Premium car collateral loans - 12 months',
      durationMonths: 12,
      interestRateMonthly: 1.1,
    },

    // =========================
    // GOLD – cầm vàng / trang sức
    // =========================
    {
      name: 'GOLD_SHORT_3M',
      description: 'Short-term gold collateral loans (<= 3 months)',
      durationMonths: 3,
      interestRateMonthly: 1.5,
    },
    {
      name: 'GOLD_STANDARD_6M',
      description: 'Standard gold collateral loans - 6 months',
      durationMonths: 6,
      interestRateMonthly: 1.7,
    },
    {
      name: 'GOLD_LONG_12M',
      description: 'Long-term gold collateral loans - 12 months',
      durationMonths: 12,
      interestRateMonthly: 1.9,
    },

    // =========================
    // SALARY – vay theo lương (không tài sản)
    // =========================
    {
      name: 'SALARY_STANDARD_6M',
      description:
        'Standard salary-based personal loans (no collateral) - 6 months',
      durationMonths: 6,
      interestRateMonthly: 1.2,
    },
    {
      name: 'SALARY_JUNIOR_6M',
      description: 'Salary loan for junior employees/freshers - 6 months',
      durationMonths: 6,
      interestRateMonthly: 1.5,
    },
    {
      name: 'SALARY_SENIOR_12M',
      description: 'Salary loan for senior/stable income - 12 months',
      durationMonths: 12,
      interestRateMonthly: 1.0,
    },

    // =========================
    // ELECTRONICS – cầm điện thoại / laptop
    // =========================
    {
      name: 'ELECTRONICS_PHONE_3M',
      description: 'Collateral loans for smartphones - 3 months',
      durationMonths: 3,
      interestRateMonthly: 2.2,
    },
    {
      name: 'ELECTRONICS_LAPTOP_6M',
      description: 'Collateral loans for laptops - 6 months',
      durationMonths: 6,
      interestRateMonthly: 2.0,
    },

    // =========================
    // HOME_APPLIANCE – đồ gia dụng
    // =========================
    {
      name: 'HOME_APPLIANCE_3M',
      description:
        'Collateral loans for home appliances (TV, fridge, etc.) - 3 months',
      durationMonths: 3,
      interestRateMonthly: 2.1,
    },
    {
      name: 'HOME_APPLIANCE_6M',
      description:
        'Collateral loans for home appliances (TV, fridge, etc.) - 6 months',
      durationMonths: 6,
      interestRateMonthly: 2.0,
    },

    // =========================
    // SME / BUSINESS – hộ kinh doanh
    // =========================
    {
      name: 'SME_MICRO_6M',
      description: 'Micro business working-capital loans - 6 months',
      durationMonths: 6,
      interestRateMonthly: 1.9,
    },
    {
      name: 'SME_SMALL_12M',
      description: 'Small business working-capital loans - 12 months',
      durationMonths: 12,
      interestRateMonthly: 1.6,
    },
    {
      name: 'SME_SECURED_18M',
      description: 'Secured SME loans (with collateral) - 18 months',
      durationMonths: 18,
      interestRateMonthly: 1.5,
    },
  ] as const;

  for (const t of types) {
    await prisma.loanType.upsert({
      where: { name: t.name },
      update: {
        description: t.description,
        durationMonths: t.durationMonths,
        interestRateMonthly: t.interestRateMonthly,
      },
      create: {
        name: t.name,
        description: t.description,
        durationMonths: t.durationMonths,
        interestRateMonthly: t.interestRateMonthly,
      },
    });
  }

  console.log('✅ LoanType seeded');
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
