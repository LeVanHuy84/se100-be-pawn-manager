'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const prisma_1 = require('../generated/prisma');
const prisma = new prisma_1.PrismaClient();
async function main() {
  console.log('Start seeding Stores...');
  const hanoiProvince = await prisma.location.findFirst({
    where: { name: { contains: 'Hà Nội' }, level: 'PROVINCE' },
  });
  const hcmProvince = await prisma.location.findFirst({
    where: { name: { contains: 'Hồ Chí Minh' }, level: 'PROVINCE' },
  });
  const dongDaWard = await prisma.location.findFirst({
    where: { name: { contains: 'Phường Hai Bà Trưng' }, level: 'WARD' },
  });
  const district1Ward = await prisma.location.findFirst({
    where: { name: { contains: 'Tân Sơn Nhì' }, level: 'WARD' },
  });
  const yenLangWard = await prisma.location.findFirst({
    where: { name: { contains: 'Yên Lãng' }, level: 'WARD' },
  });
  const cauGiayWard = await prisma.location.findFirst({
    where: { name: { contains: 'Cầu Giấy' }, level: 'WARD' },
  });
  const fallbackProvince = await prisma.location.findFirst({
    where: { level: 'PROVINCE' },
  });
  const fallbackWard = await prisma.location.findFirst({
    where: { level: 'WARD', parentId: { not: null } },
  });
  const hanoiProvinceId = hanoiProvince?.id || fallbackProvince?.id;
  const hcmProvinceId = hcmProvince?.id || fallbackProvince?.id;
  const dongDaWardId = dongDaWard?.id || fallbackWard?.id;
  const district1WardId = district1Ward?.id || fallbackWard?.id;
  const yenLangWardId = yenLangWard?.id || fallbackWard?.id;
  const cauGiayWardId = cauGiayWard?.id || fallbackWard?.id;
  if (!hanoiProvinceId || !dongDaWardId) {
    console.error(
      'No locations found in database. Please run location seed first.',
    );
    process.exit(1);
  }
  const validDongDaWardId = dongDaWardId;
  const validDistrict1WardId = district1WardId || dongDaWardId;
  const validYenLangWardId = yenLangWardId || dongDaWardId;
  const validCauGiayWardId = cauGiayWardId || dongDaWardId;
  const stores = [
    {
      name: 'Phùng Khắc Khoan - TP.HCM',
      address: '88 Láng Hạ',
      storeInfo: {
        type: 'HEADQUARTERS',
        hotline: '1800-1111',
        email: 'contact@finance.vn',
        manager: 'Nguyễn Văn Giám Đốc',
        operatingHours: '08:00 - 17:30',
        coordinates: { lat: 21.016, lng: 105.815 },
        bankAccount: {
          bankName: 'Vietcombank',
          accountNumber: '999988887777',
          accountName: 'CTY TNHH TAI CHINH ABC',
        },
      },
      isActive: true,
      wardId: validDistrict1WardId,
    },
    {
      name: 'PGD Nguyễn Trãi - TP.HCM',
      address: '256 Nguyễn Trãi',
      storeInfo: {
        type: 'BRANCH',
        hotline: '028.3999.8888',
        manager: 'Trần Thị Trưởng Phòng',
        operatingHours: '08:00 - 21:00',
        services: ['Cầm cố', 'Thanh toán hộ', 'Thu hồi nợ'],
        cashLimit: 500000000,
      },
      isActive: true,
      wardId: validDistrict1WardId,
    },
    {
      name: 'Cửa hàng Yên Lãng',
      address: 'Số 36 Ngõ 120',
      storeInfo: {
        type: 'WAREHOUSE',
        hotline: '0909.123.456',
        manager: 'Lê Văn Thủ Kho',
        capacity: {
          carSlots: 50,
          motorSlots: 200,
        },
        securityLevel: 'A',
        facilities: ['Mái che', 'Camera 24/7', 'PCCC'],
      },
      isActive: true,
      wardId: validYenLangWardId,
    },
    {
      name: 'PGD Cầu Giấy (Đang sửa chữa)',
      address: '102 Cầu Giấy',
      storeInfo: {
        type: 'BRANCH',
        note: 'Tạm ngưng hoạt động để nâng cấp',
        reopenDate: '2024-01-01',
      },
      isActive: false,
      wardId: validCauGiayWardId,
    },
  ];
  for (const store of stores) {
    const existingStore = await prisma.store.findFirst({
      where: { name: store.name },
    });
    if (!existingStore) {
      await prisma.store.create({
        data: {
          name: store.name,
          address: store.address,
          storeInfo: store.storeInfo,
          isActive: store.isActive,
          wardId: store.wardId,
        },
      });
      console.log(`Created Store: ${store.name}`);
    } else {
      await prisma.store.update({
        where: { id: existingStore.id },
        data: {
          address: store.address,
          storeInfo: store.storeInfo,
          isActive: store.isActive,
          wardId: store.wardId,
        },
      });
      console.log(`Updated Store: ${store.name}`);
    }
  }
  console.log('Seeding Stores finished.');
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
//# sourceMappingURL=store.js.map
