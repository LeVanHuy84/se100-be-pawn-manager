import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Stores...');

  const stores = [
    {
      name: 'Hội Sở Chính - Hà Nội',
      address: '88 Láng Hạ, Quận Đống Đa, Hà Nội',
      storeInfo: {
        type: 'HEADQUARTERS', // Loại cửa hàng
        hotline: '1800-1111',
        email: 'contact@finance.vn',
        manager: 'Nguyễn Văn Giám Đốc',
        operatingHours: '08:00 - 17:30',
        coordinates: { lat: 21.016, lng: 105.815 }, // Tọa độ
        bankAccount: { // Tài khoản nhận tiền
          bankName: 'Vietcombank',
          accountNumber: '999988887777',
          accountName: 'CTY TNHH TAI CHINH ABC'
        }
      },
      isActive: true,
    },
    {
      name: 'PGD Nguyễn Trãi - TP.HCM',
      address: '256 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
      storeInfo: {
        type: 'BRANCH',
        hotline: '028.3999.8888',
        manager: 'Trần Thị Trưởng Phòng',
        operatingHours: '08:00 - 21:00', // PGD thường mở muộn hơn
        services: ['Cầm cố', 'Thanh toán hộ', 'Thu hồi nợ'],
        cashLimit: 500000000 // Hạn mức tiền mặt tại quầy (Ví dụ: 500tr)
      },
      isActive: true,
    },
    {
      name: 'Kho Bãi Long Biên (Lưu giữ Ô tô)',
      address: 'Khu công nghiệp Sài Đồng, Long Biên, Hà Nội',
      storeInfo: {
        type: 'WAREHOUSE',
        hotline: '0909.123.456',
        manager: 'Lê Văn Thủ Kho',
        capacity: {
          carSlots: 50,    // Sức chứa 50 ô tô
          motorSlots: 200  // Sức chứa 200 xe máy
        },
        securityLevel: 'A', // Mức độ an ninh
        facilities: ['Mái che', 'Camera 24/7', 'PCCC']
      },
      isActive: true,
    },
    {
      name: 'PGD Cầu Giấy (Đang sửa chữa)',
      address: '102 Cầu Giấy, Hà Nội',
      storeInfo: {
        type: 'BRANCH',
        note: 'Tạm ngưng hoạt động để nâng cấp',
        reopenDate: '2024-01-01'
      },
      isActive: false, // Set false để test logic lọc cửa hàng active
    },
  ];

  for (const store of stores) {
    // Tìm store dựa theo tên để tránh tạo trùng lặp
    const existingStore = await prisma.store.findFirst({
      where: { name: store.name },
    });

    if (!existingStore) {
      await prisma.store.create({
        data: store,
      });
      console.log(`Created Store: ${store.name}`);
    } else {
      // Nếu muốn update lại thông tin mới nhất mỗi khi chạy seed:
      await prisma.store.update({
        where: { id: existingStore.id },
        data: {
            address: store.address,
            storeInfo: store.storeInfo,
            isActive: store.isActive
        }
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