import { PrismaClient } from '../../../generated/prisma';
import data from './locations.json';
import { LocationLevel } from 'generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const provinceMap = new Map<string, string>();

  // 1. Seed PROVINCES (1 lần mỗi tỉnh)
  for (const row of data) {
    if (!provinceMap.has(row.provinceCode)) {
      const province = await prisma.location.upsert({
        where: { code: row.provinceCode },
        update: {},
        create: {
          code: row.provinceCode,
          name: row.provinceName,
          level: LocationLevel.PROVINCE,
        },
      });
      provinceMap.set(row.provinceCode, province.id);
    }
  }

  // 2. Seed WARDS
  for (const row of data) {
    await prisma.location.upsert({
      where: { code: row.wardCode },
      update: {},
      create: {
        code: row.wardCode,
        name: row.wardName,
        level: LocationLevel.WARD,
        parentId: provinceMap.get(row.provinceCode)!,
      },
    });
  }
}

main()
  .then(() => console.log('✅ Seed admin units xong'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
