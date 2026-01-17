import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Stores...');

  // Get location IDs for Hanoi and HCMC
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

  // Fallback locations
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

  // Type assertions after validation
  const validDongDaWardId = dongDaWardId as string;
  const validDistrict1WardId = (district1WardId || dongDaWardId) as string;
  const validYenLangWardId = (yenLangWardId || dongDaWardId) as string;
  const validCauGiayWardId = (cauGiayWardId || dongDaWardId) as string;

  const stores = [
    {
      name: 'Phùng Khắc Khoan - TP.HCM',
      address: '88 Láng Hạ',
      storeInfo: {
        type: 'HEADQUARTERS', // Loại cửa hàng
        hotline: '1800-1111',
        email: 'contact@finance.vn',
        manager: 'Nguyễn Văn Giám Đốc',
        operatingHours: '08:00 - 17:30',
        coordinates: { lat: 21.016, lng: 105.815 }, // Tọa độ
        bankAccount: {
          // Tài khoản nhận tiền
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
        operatingHours: '08:00 - 21:00', // PGD thường mở muộn hơn
        services: ['Cầm cố', 'Thanh toán hộ', 'Thu hồi nợ'],
        cashLimit: 500000000, // Hạn mức tiền mặt tại quầy (Ví dụ: 500tr)
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
          carSlots: 50, // Sức chứa 50 ô tô
          motorSlots: 200, // Sức chứa 200 xe máy
        },
        securityLevel: 'A', // Mức độ an ninh
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
      isActive: false, // Set false để test logic lọc cửa hàng active
      wardId: validCauGiayWardId,
    },
  ];

  for (const store of stores) {
    // Tìm store dựa theo tên để tránh tạo trùng lặp
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
      // Nếu muốn update lại thông tin mới nhất mỗi khi chạy seed:
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
