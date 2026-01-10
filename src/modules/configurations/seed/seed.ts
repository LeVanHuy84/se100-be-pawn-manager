import { PrismaService } from 'src/prisma/prisma.service';

const prisma = new PrismaService();

async function main() {
  console.log('🌱 Seeding SystemParameter...');

  const DEFAULT_SYSTEM_PARAMETERS = [
    // =========================
    // RATES – Lãi suất & phí
    // =========================
    {
      paramGroup: 'RATES',
      paramKey: 'BIKE_DEFAULT_INTEREST',
      paramValue: '1.6', // %/month
      dataType: 'DECIMAL',
      description: 'Default interest rate for motorbike loans (%/month)',
    },

    {
      paramGroup: 'RATES',
      paramKey: 'PENALTY_INTEREST_RATE',
      paramValue: '0.05', // 5%/month
      dataType: 'DECIMAL',
      description:
        'Penalty interest rate applied to overdue principal (%/month)',
    },
    {
      paramGroup: 'RATES',
      paramKey: 'LEGAL_INTEREST_CAP',
      paramValue: '20.0', // 20% per year (Vietnam Civil Code 2015)
      dataType: 'DECIMAL',
      description:
        'Legal maximum annual interest rate cap in Vietnam (%). System warns when total rate exceeds this limit (per Civil Code 2015)',
    },
    {
      paramGroup: 'RATES',
      paramKey: 'MANAGEMENT_FEE_PERCENT',
      paramValue: '0.02', // %
      dataType: 'DECIMAL',
      description: 'Management fee as percentage of loan amount (%)',
    },

    // =========================
    // LIMITS – Hạn mức & điều kiện
    // =========================
    {
      paramGroup: 'LIMITS',
      paramKey: 'BIKE_MAX_LTV',
      paramValue: '70', // %
      dataType: 'DECIMAL',
      description: 'Maximum LTV ratio for motorbike collateral (%)',
    },
    {
      paramGroup: 'LIMITS',
      paramKey: 'CAR_MAX_LTV',
      paramValue: '80', // %
      dataType: 'DECIMAL',
      description: 'Maximum LTV ratio for car collateral (%)',
    },
    {
      paramGroup: 'LIMITS',
      paramKey: 'GOLD_MAX_LTV',
      paramValue: '85', // %
      dataType: 'DECIMAL',
      description: 'Maximum LTV ratio for gold collateral (%)',
    },
    {
      paramGroup: 'LIMITS',
      paramKey: 'MIN_INCOME_REQUIRED',
      paramValue: '5000000', // VND
      dataType: 'DECIMAL',
      description: 'Minimum monthly income required for standard loans (VND)',
    },
    {
      paramGroup: 'LIMITS',
      paramKey: 'SALARY_INCOME_MULTIPLIER',
      paramValue: '3.0',
      dataType: 'DECIMAL',
      description:
        'Maximum allowed total installment = multiplier × monthly income',
    },
    {
      paramGroup: 'LIMITS',
      paramKey: 'MAX_ACTIVE_LOANS_PER_CUSTOMER',
      paramValue: '3',
      dataType: 'INTEGER',
      description: 'Maximum number of active loans per customer',
    },
    {
      paramGroup: 'LIMITS',
      paramKey: 'MAX_TENOR_MONTHS',
      paramValue: '24',
      dataType: 'INTEGER',
      description: 'Maximum loan tenor allowed (months)',
    },
    {
      paramGroup: 'LIMITS',
      paramKey: 'MAX_TOTAL_OUTSTANDING_PER_CUSTOMER',
      paramValue: '100000000', // 100M
      dataType: 'DECIMAL',
      description:
        'Maximum total outstanding across all loans per customer (VND)',
    },

    // =========================
    // SYSTEM – Cấu hình hệ thống
    // =========================
    {
      paramGroup: 'SYSTEM',
      paramKey: 'CURRENCY',
      paramValue: 'VND',
      dataType: 'STRING',
      description: 'Default display currency code',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'TIMEZONE',
      paramValue: 'Asia/Ho_Chi_Minh',
      dataType: 'STRING',
      description: 'Default system timezone',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'ENABLE_AUTO_APPROVAL',
      paramValue: 'false',
      dataType: 'BOOLEAN',
      description: 'Whether to enable auto approval for low-risk loans',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'AUTO_APPROVAL_MAX_AMOUNT',
      paramValue: '20000000', // 20M
      dataType: 'DECIMAL',
      description: 'Maximum loan amount eligible for auto approval (VND)',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'REMINDER_DAYS_BEFORE_DUE',
      paramValue: '2',
      dataType: 'INTEGER',
      description: 'Number of days before due date to send reminder',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'REMINDER_DAYS_AFTER_OVERDUE',
      paramValue: '1',
      dataType: 'INTEGER',
      description: 'Number of days after overdue to send reminder',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'MAX_LOGIN_ATTEMPTS',
      paramValue: '5',
      dataType: 'INTEGER',
      description: 'Max failed login attempts before account lock',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'SUPPORTED_ASSET_TYPES',
      paramValue: '["CAR","MOTORBIKE","GOLD"]',
      dataType: 'JSON',
      description:
        'List of supported asset types for collateral in JSON format',
    },
    {
      paramGroup: 'SYSTEM',
      paramKey: 'DASHBOARD_DEFAULT_DATE_RANGE',
      paramValue: 'LAST_30_DAYS',
      dataType: 'STRING',
      description: 'Default date range filter for dashboard views',
    },
  ] as const;

  console.log('Ensuring default SystemParameters...');

  for (const param of DEFAULT_SYSTEM_PARAMETERS) {
    await prisma.systemParameter.upsert({
      where: {
        paramGroup_paramKey: {
          paramGroup: param.paramGroup,
          paramKey: param.paramKey,
        },
      },
      update: {}, // không override giá trị hiện có
      create: {
        ...param,
      },
    });
  }

  console.log('✅ Default SystemParameters ensured');
}

main()
  .then(async () => {
    console.log('✅ Seed SystemParameter done');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
