import { PrismaClient, LocationLevel } from '../../../generated/prisma';
import data from './locations.json';

const prisma = new PrismaClient();

async function main() {
  console.time('⏱ location-seed');

  /**
   * =========================
   * 1. CREATE PROVINCES
   * =========================
   */
  const provinceMap = new Map<string, string>();

  const provinceData = Array.from(
    new Map(
      data.map((r) => [
        r.provinceCode,
        {
          code: r.provinceCode,
          name: r.provinceName,
          level: LocationLevel.PROVINCE,
        },
      ]),
    ).values(),
  );

  await prisma.location.createMany({
    data: provinceData,
    skipDuplicates: true,
  });

  /**
   * =========================
   * 2. LOAD PROVINCE MAP
   * =========================
   */
  const provinces = await prisma.location.findMany({
    where: { level: LocationLevel.PROVINCE },
    select: { id: true, code: true },
  });

  for (const p of provinces) {
    provinceMap.set(p.code, p.id);
  }

  /**
   * =========================
   * 3. CREATE WARDS (BATCH)
   * =========================
   */
  const wards = data.map((r) => ({
    code: r.wardCode,
    name: r.wardName,
    level: LocationLevel.WARD,
    parentId: provinceMap.get(r.provinceCode)!,
  }));

  const BATCH_SIZE = 1000;

  for (let i = 0; i < wards.length; i += BATCH_SIZE) {
    await prisma.location.createMany({
      data: wards.slice(i, i + BATCH_SIZE),
      skipDuplicates: true,
    });
  }

  console.timeEnd('⏱ location-seed');
}

main()
  .then(() => console.log('✅ Seed location xong (fast mode)'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
