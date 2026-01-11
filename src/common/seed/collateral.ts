// prisma/seed-collateral.ts

import { PrismaClient, CollateralStatus } from '../../../generated/prisma'; // Đảm bảo bạn đã generate prisma client

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Collateral...');

  const types = await prisma.collateralType.findMany();
  const stores = await prisma.store.findMany();
  const storages = await prisma.storage.findMany();

  const findType = (name: string) =>
    types.find((t) => t.name.includes(name))?.id;
  const findStore = (name: string) =>
    stores.find((s) => s.name.includes(name))?.id;
  const findStorage = (name: string) =>
    storages.find((s) => s.name.includes(name))?.id;

  if (types.length === 0 || stores.length === 0) {
    console.error(
      'Lỗi: Cần chạy seed cho CollateralType, Store và Storage trước!',
    );
    return;
  }

  const collaterals = [
    // --- Mẫu 1: Ô tô Mazda CX-5 (Đang lưu kho) ---
    {
      ownerName: 'Nguyen Van A',
      collateralTypeId: findType('Ô tô')!, // Tìm ID của loại 'Ô tô'
      storeId: findStore('Hội Sở Chính'), // Nhận tại Hội Sở
      storageId: findStorage('Kho Bãi Ô tô'), // Lưu tại kho ô tô
      status: 'STORED' as CollateralStatus, // Enum: Đang lưu kho
      loanId: null, // Yêu cầu để trống

      // Thông tin chi tiết (JSON) đặc thù cho Ô tô
      collateralInfo: {
        brand: 'Mazda',
        model: 'CX-5',
        year: 2022,
        color: 'Trắng',
        licensePlate: '30H-123.45', // Biển số
        vinNumber: 'MM888...', // Số khung
        engineNumber: 'J202...', // Số máy
        odometer: 15000, // Số ODO
        condition: 'Mới 98%, không trầy xước',
      },

      appraisedValue: 800000000, // Định giá 800 triệu
      ltvRatio: 0.7, // Tỷ lệ vay 70%
      appraisalDate: new Date(),
      appraisalNotes: 'Xe chính chủ, giấy tờ đầy đủ, nội thất zin.',

      storageLocation: 'Khu A - Ô số 12', // Vị trí trong kho
      receivedDate: new Date(),

      images: [
        'https://s3.aws.com/pawn/car_front.jpg',
        'https://s3.aws.com/pawn/car_interior.jpg',
      ],
    },

    // --- Mẫu 2: iPhone 14 Pro Max (Đã nhận, chờ duyệt) ---
    {
      ownerName: 'Tran Thi B',
      collateralTypeId: findType('Điện thoại')!,
      storeId: findStore('Nguyễn Trãi'),
      storageId: findStorage('Két Sắt'), // Lưu tại két sắt
      status: 'PROPOSED' as CollateralStatus, // Enum: Đang đề xuất
      loanId: null,

      // Thông tin chi tiết (JSON) đặc thù cho Điện thoại
      collateralInfo: {
        brand: 'Apple',
        model: 'iPhone 14 Pro Max',
        storage: '256GB',
        color: 'Deep Purple',
        imei: '35468800...',
        icloudStatus: 'Clean', // Quan trọng với iPhone
        batteryHealth: '92%',
        accessories: ['Sạc', 'Cáp', 'Hộp'],
      },

      appraisedValue: 18000000,
      ltvRatio: 0.8,
      appraisalDate: new Date(),
      appraisalNotes: 'Máy đẹp, vỏ có xước dăm nhẹ góc dưới.',

      storageLocation: 'Tủ Két Số 05 - Ngăn 2',
      receivedDate: new Date(),

      images: ['https://s3.aws.com/pawn/iphone_front.jpg'],
    },

    // --- Mẫu 3: Xe máy SH Mode (Đang lưu kho) ---
    {
      ownerName: 'Le Thi C',
      collateralTypeId: findType('Xe máy')!,
      storeId: findStore('Nguyễn Trãi'),
      storageId: findStorage('Kho Xe Máy'),
      status: 'STORED' as CollateralStatus,
      loanId: null,

      collateralInfo: {
        brand: 'Honda',
        model: 'SH Mode',
        year: 2020,
        color: 'Xám Xi Măng',
        licensePlate: '59P1-555.66',
        registrationCert: 'Có (Bản gốc)',
      },

      appraisedValue: 45000000,
      ltvRatio: 0.6, // Vay thấp

      storageLocation: 'Hàng 3 - Vạch vàng',
      receivedDate: new Date('2023-11-01'),

      images: [],
    },

    // --- Mẫu 4: Laptop Dell XPS (Đã thanh lý/Bán xong) ---
    {
      ownerName: 'Pham Van D',
      collateralTypeId: findType('Laptop')!,
      storeId: findStore('Hội Sở Chính'),
      storageId: null, // Đã bán nên không còn trong kho
      status: 'SOLD' as CollateralStatus, // Giả định có trạng thái SOLD/LIQUIDATED
      loanId: null,

      collateralInfo: {
        brand: 'Dell',
        model: 'XPS 15 9500',
        cpu: 'Core i7 10750H',
        ram: '16GB',
        ssd: '512GB',
        screen: '4K Touch',
      },

      appraisedValue: 20000000,

      // Thông tin thanh lý
      sellPrice: 22000000, // Bán được 22tr
      sellDate: new Date('2023-12-10'),

      images: ['https://s3.aws.com/pawn/laptop.jpg'],
    },
  ];

  for (const item of collaterals) {
    await prisma.collateral.create({
      data: item,
    });
    console.log(
      `Created Collateral for owner: ${item.ownerName} (${item.status})`,
    );
  }

  console.log('Seeding Collateral finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
