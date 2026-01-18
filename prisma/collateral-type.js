'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const prisma_1 = require('../generated/prisma');
const prisma = new prisma_1.PrismaClient();
async function main() {
  console.log('Start seeding CollateralType...');
  const collateralTypes = [
    {
      name: 'Điện thoại / Tablet',
      custodyFeeRateMonthly: 0.05,
    },
    {
      name: 'Laptop / Máy tính',
      custodyFeeRateMonthly: 0.045,
    },
    {
      name: 'Xe máy',
      custodyFeeRateMonthly: 0.04,
    },
    {
      name: 'Máy ảnh (Body + Lens)',
      custodyFeeRateMonthly: 0.045,
    },
    {
      name: 'Ô tô',
      custodyFeeRateMonthly: 0.03,
    },
    {
      name: 'Túi xách hàng hiệu',
      custodyFeeRateMonthly: 0.025,
    },
    {
      name: 'Đồng hồ cao cấp',
      custodyFeeRateMonthly: 0.02,
    },
    {
      name: 'Vàng / Trang sức',
      custodyFeeRateMonthly: 0.01,
    },
    {
      name: 'Bất động sản (Sổ đỏ)',
      custodyFeeRateMonthly: 0.015,
    },
    {
      name: 'Sim số đẹp',
      custodyFeeRateMonthly: 0.005,
    },
  ];
  for (const type of collateralTypes) {
    const existingType = await prisma.collateralType.findFirst({
      where: { name: type.name },
    });
    if (existingType) {
      await prisma.collateralType.update({
        where: { id: existingType.id },
        data: {
          custodyFeeRateMonthly: type.custodyFeeRateMonthly,
        },
      });
      console.log(`Updated: ${type.name}`);
    } else {
      await prisma.collateralType.create({
        data: type,
      });
      console.log(`Created: ${type.name}`);
    }
  }
  console.log('Seeding finished.');
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
//# sourceMappingURL=collateral-type.js.map
