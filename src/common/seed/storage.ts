import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Storage...');

  const storages = [
    {
      name: 'Kho Bãi Ô tô Thủ Đức',
      address: 'Xa Lộ Hà Nội, Phường Hiệp Phú, TP. Thủ Đức, TP.HCM',
      isActive: true,
      storageInfo: {
        type: 'OUTDOOR_ROOFED', // Bãi ngoài trời có mái che
        manager: {
          name: 'Lê Văn Kho',
          phone: '0909.888.777',
        },
        capacity: {
          car: 100, // Chứa được 100 ô tô
          truck: 20, // 20 xe tải
        },
        facilities: ['Camera AI', 'Bảo vệ 24/7', 'Hệ thống PCCC vòi phun'],
        pricePolicy: 'Standard', // Phân loại giá kho (nếu có)
      },
    },
    {
      name: 'Kho Xe Máy Gò Vấp (Tầng hầm)',
      address: '123 Phan Văn Trị, Gò Vấp, TP.HCM',
      isActive: true,
      storageInfo: {
        type: 'INDOOR_BASEMENT', // Tầng hầm trong nhà
        manager: {
          name: 'Nguyễn Thị Giữ Xe',
          phone: '0912.333.444',
        },
        capacity: {
          motorbike: 500, // Chứa được 500 xe máy
          bicycle: 50,
        },
        facilities: ['Thẻ từ', 'Camera hồng ngoại'],
        maxHeight: '2.2m', // Giới hạn chiều cao xe
      },
    },
    {
      name: 'Kho Két Sắt Trung Tâm (Hàng hiệu & Vàng)',
      address: 'Tầng 5, Tòa nhà Finance Tower, Ba Đình, Hà Nội',
      isActive: true,
      storageInfo: {
        type: 'HIGH_SECURITY_VAULT', // Két sắt bảo mật cao
        manager: {
          name: 'Trần Bảo Mật',
          phone: '0999.666.888',
        },
        capacity: {
          smallSafeBox: 200, // 200 két nhỏ (điện thoại, vàng)
          largeSafeBox: 50, // 50 két lớn (túi xách, laptop)
        },
        conditions: {
          temperature: '25°C', // Nhiệt độ cố định bảo quản đồ da
          humidity: '40%', // Độ ẩm thấp chống mốc máy ảnh/túi
        },
        insurance: 'Bảo hiểm cháy nổ 100% giá trị',
      },
    },
    {
      name: 'Kho Đống Đa (Đang bảo trì)',
      address: 'Ngõ 10 Láng Hạ, Đống Đa, Hà Nội',
      isActive: false, // Kho này đang đóng
      storageInfo: {
        type: 'INDOOR',
        reason: 'Nâng cấp hệ thống PCCC',
        expectedReopen: '2025-06-01',
      },
    },
  ];

  for (const item of storages) {
    // Tìm xem kho đã tồn tại chưa để update hoặc create
    const existingStorage = await prisma.storage.findFirst({
      where: { name: item.name },
    });

    if (existingStorage) {
      await prisma.storage.update({
        where: { id: existingStorage.id },
        data: {
          address: item.address,
          storageInfo: item.storageInfo,
          isActive: item.isActive,
        },
      });
      console.log(`Updated Storage: ${item.name}`);
    } else {
      await prisma.storage.create({
        data: item,
      });
      console.log(`Created Storage: ${item.name}`);
    }
  }

  console.log('Seeding Storage finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
