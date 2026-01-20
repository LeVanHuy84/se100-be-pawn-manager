import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Stores...');

  // Get location IDs for Hanoi and HCMC
  const hanoiProvince = await prisma.location.findFirst({
    where: { name: { contains: 'Hà Nội' }, level: 'PROVINCE' },
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
      name: 'Hội Sở Chính - TP.HCM',
      address: '88 Phùng Khắc Khoan, Q.1',
      storeInfo: {
        type: 'HEADQUARTERS', // Loại cửa hàng
        hotline: '1800-1111',
        email: 'contact@finance.vn',
        manager: 'Nguyễn Văn Giám Đốc',
        operatingHours: '08:00 - 17:30',
        coordinates: { lat: 10.782, lng: 106.695 }, // Tọa độ HCM
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
      address: '256 Nguyễn Trãi, Q.1',
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
      name: 'Chi nhánh Tân Bình - TP.HCM',
      address: 'Số 36 Ngõ 120 Cộng Hòa',
      storeInfo: {
        type: 'BRANCH',
        hotline: '028.3888.7777',
        manager: 'Lê Văn Chi',
        operatingHours: '08:30 - 20:00',
        services: ['Cầm cố xe máy', 'Cầm cố vàng', 'Cầm cố điện thoại'],
        cashLimit: 300000000,
      },
      isActive: true,
      wardId: validYenLangWardId,
    },
    {
      name: 'Chi nhánh Bình Thạnh - TP.HCM',
      address: '45 Xô Viết Nghệ Tĩnh, Bình Thạnh',
      storeInfo: {
        type: 'BRANCH',
        hotline: '028.3777.6666',
        manager: 'Phạm Thị Bình',
        operatingHours: '08:00 - 20:00',
        services: ['Cầm cố ô tô', 'Cầm cố xe máy', 'Thanh lý tài sản'],
        cashLimit: 700000000,
      },
      isActive: true,
      wardId: validCauGiayWardId,
    },
    {
      name: 'Chi nhánh Thủ Đức - TP.HCM',
      address: '123 Võ Văn Ngân, Thủ Đức',
      storeInfo: {
        type: 'BRANCH',
        hotline: '028.3666.5555',
        manager: 'Nguyễn Văn Đức',
        operatingHours: '08:30 - 19:30',
        services: ['Cầm cố điện thoại', 'Cầm cố laptop', 'Cầm cố máy ảnh'],
        cashLimit: 200000000,
      },
      isActive: true,
      wardId: validDongDaWardId,
    },
    {
      name: 'Chi nhánh Gò Vấp - TP.HCM (Tạm đóng)',
      address: '789 Quang Trung, Gò Vấp',
      storeInfo: {
        type: 'BRANCH',
        hotline: '028.3555.4444',
        manager: 'Trần Văn Vấp',
        operatingHours: 'Tạm đóng cửa',
        services: [],
        cashLimit: 0,
      },
      isActive: false, // Store tạm đóng
      wardId: validDistrict1WardId,
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
