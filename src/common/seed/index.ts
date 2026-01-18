import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Master Seed Script
 * Chạy tất cả các file seed theo đúng thứ tự phụ thuộc
 */

interface SeedStep {
  name: string;
  file: string;
  description: string;
}

const seedSteps: SeedStep[] = [
  // Giai đoạn 1: Master Data
  {
    name: 'LoanType',
    file: 'src/modules/loan-simulations/seed/seed.ts',
    description: 'Các loại hình vay (Vehicle, Gold, Salary, etc.)',
  },
  {
    name: 'SystemParameter',
    file: 'src/common/seed/configuration.ts',
    description: 'Tham số hệ thống (Interest rates, Fees, Limits)',
  },
  // {
  //   name: 'Location',
  //   file: 'src/common/seed/location.ts',
  //   description: 'Tỉnh/Thành phố và Xã/Phường (Administrative units)',
  // },
  {
    name: 'CollateralType',
    file: 'src/common/seed/collateral-type.ts',
    description: 'Loại tài sản thế chấp (Xe máy, Ô tô, Vàng, etc.)',
  },
  {
    name: 'Store',
    file: 'src/common/seed/store.ts',
    description: 'Chi nhánh/Cửa hàng',
  },
  {
    name: 'Customer',
    file: 'src/common/seed/customer.ts',
    description: 'Khách hàng',
  },

  // Giai đoạn 2: Tài sản
  {
    name: 'Collateral',
    file: 'src/common/seed/collateral.ts',
    description: 'Tài sản thế chấp',
  },

  // Giai đoạn 3: Khoản vay
  {
    name: 'Loan',
    file: 'src/common/seed/loan.ts',
    description: 'Khoản vay (bao gồm Repayment Schedule)',
  },

  // Giai đoạn 4: Giải ngân
  {
    name: 'Disbursement',
    file: 'src/common/seed/disbursement.ts',
    description: 'Giải ngân (tạo log cho các khoản vay đã duyệt)',
  },

  // Giai đoạn 5: Thanh toán
  {
    name: 'Payment',
    file: 'src/common/seed/payment.ts',
    description: 'Thanh toán và phân bổ',
  },

  // Giai đoạn 6: Communication
  {
    name: 'Communication',
    file: 'src/common/seed/communication.ts',
    description: 'Thông báo và nhắc nhở (SMS, Email, Phone)',
  },

  // Giai đoạn 7: Audit
  {
    name: 'AuditLog',
    file: 'src/common/seed/audit-log.ts',
    description: 'Nhật ký hoạt động hệ thống',
  },
];

async function runSeeds() {
  console.log('🌱 ========================================');
  console.log('🌱 MASTER SEED SCRIPT');
  console.log('🌱 ========================================\n');
  console.log('🔄 Resetting database...');

  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < seedSteps.length; i++) {
    const step = seedSteps[i];
    const stepNumber = i + 1;

    console.log(`\n📦 [${stepNumber}/${seedSteps.length}] ${step.name}`);
    console.log(`   ${step.description}`);
    console.log(`   File: ${step.file}`);
    console.log('   ----------------------------------------');

    try {
      const stepStartTime = Date.now();

      // Chạy seed file
      execSync(`npx tsx ${step.file}`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../../../'),
      });

      const duration = ((Date.now() - stepStartTime) / 1000).toFixed(2);
      console.log(`   ✅ Completed in ${duration}s`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${step.name}`);
      console.error(`   Error: ${error.message}`);
      failedCount++;

      // Dừng lại nếu gặp lỗi
      console.log('\n🛑 Seeding stopped due to error.');
      console.log('💡 Tip: Check the error above and fix before continuing.');
      process.exit(1);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n🌱 ========================================');
  console.log('🌱 SEEDING SUMMARY');
  console.log('🌱 ========================================');
  console.log(`✅ Success: ${successCount}/${seedSteps.length}`);
  console.log(`❌ Failed:  ${failedCount}/${seedSteps.length}`);
  console.log(`⏱️  Total time: ${totalDuration}s`);
  console.log('🌱 ========================================\n');

  if (successCount === seedSteps.length) {
    console.log('🎉 All seeds completed successfully!');
    console.log('💡 You can now view the data using:');
    console.log('   npx prisma studio');
  }
}

// Chạy
runSeeds().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
