// prisma/seed-collateral.ts

import { PrismaClient, CollateralStatus } from '../../../generated/prisma'; // Đảm bảo bạn đã generate prisma client

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Collateral...');

  const types = await prisma.collateralType.findMany();
  const stores = await prisma.store.findMany();

  const findType = (name: string) =>
    types.find((t) => t.name.includes(name))?.id;
  const findStore = (name: string) =>
    stores.find((s) => s.name.includes(name))?.id;

  if (types.length === 0 || stores.length === 0) {
    console.error(
      'Lỗi: Cần chạy seed cho CollateralType, Store và Storage trước!',
    );
    return;
  }

  const collaterals = [
    // --- Xe máy Honda SH Mode (Đang lưu kho) ---
    {
      ownerName: 'Nguyen Van A',
      collateralTypeId: findType('Xe máy')!,
      storeId: findStore('Hội Sở Chính'),
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
      ltvRatio: 0.7,
      appraisalDate: new Date(),
      appraisalNotes: 'Xe đẹp, máy zin, giấy tờ đầy đủ',
      storageLocation: 'Khu A - Dãy 1',
      receivedDate: new Date(),
      images: [],
    },

    // --- Ô tô Mazda CX-5 (Đang lưu kho) ---
    {
      ownerName: 'Tran Thi B',
      collateralTypeId: findType('Ô tô')!,
      storeId: findStore('Nguyễn Trãi'),
      status: 'STORED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        brand: 'Mazda',
        model: 'CX-5',
        year: 2022,
        color: 'Trắng',
        licensePlate: '30H-123.45',
        vinNumber: 'MM888...',
        engineNumber: 'J202...',
        odometer: 15000,
        condition: 'Mới 98%, không trầy xước',
      },
      appraisedValue: 800000000,
      ltvRatio: 0.7,
      appraisalDate: new Date(),
      appraisalNotes: 'Xe chính chủ, giấy tờ đầy đủ, nội thất zin.',
      storageLocation: 'Khu B - Ô số 12',
      receivedDate: new Date(),
      images: ['https://s3.aws.com/pawn/car_front.jpg'],
    },

    // --- iPhone 14 Pro Max (Đang đề xuất) ---
    {
      ownerName: 'Le Thi C',
      collateralTypeId: findType('Điện thoại')!,
      storeId: findStore('Tân Bình'),
      status: 'PROPOSED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        brand: 'Apple',
        model: 'iPhone 14 Pro Max',
        storage: '256GB',
        color: 'Deep Purple',
        imei: '35468800...',
        icloudStatus: 'Clean',
        batteryHealth: '92%',
        accessories: ['Sạc', 'Cáp', 'Hộp'],
      },
      appraisedValue: 18000000,
      ltvRatio: 0.8,
      appraisalDate: new Date(),
      appraisalNotes: 'Máy đẹp, vỏ có xước nhẹ góc dưới.',
      storageLocation: 'Tủ Két Số 05 - Ngăn 2',
      receivedDate: new Date(),
      images: ['https://s3.aws.com/pawn/iphone_front.jpg'],
    },

    // --- Laptop Dell XPS (Đã bán) ---
    {
      ownerName: 'Pham Van D',
      collateralTypeId: findType('Laptop')!,
      storeId: findStore('Hội Sở Chính'),
      status: 'SOLD' as CollateralStatus,
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
      sellPrice: 22000000,
      sellDate: new Date('2026-01-10'),
      images: ['https://s3.aws.com/pawn/laptop.jpg'],
    },

    // --- Vàng SJC 5 chỉ (Đang lưu kho) ---
    {
      ownerName: 'Hoang Thi E',
      collateralTypeId: findType('Vàng')!,
      storeId: findStore('Bình Thạnh'),
      status: 'STORED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        type: 'Vàng SJC',
        weight: 5, // 5 chỉ
        purity: '9999',
        certificate: 'Có giấy chứng nhận SJC',
      },
      appraisedValue: 35000000,
      ltvRatio: 0.9,
      appraisalDate: new Date(),
      appraisalNotes: 'Vàng thật, có giấy chứng nhận',
      storageLocation: 'két sắt số 3',
      receivedDate: new Date(),
      images: [],
    },

    // --- Xe máy Yamaha Exciter (Đang cầm cố) ---
    {
      ownerName: 'Ngo Van F',
      collateralTypeId: findType('Xe máy')!,
      storeId: findStore('Thủ Đức'),
      status: 'PLEDGED' as CollateralStatus,
      loanId: null, // Sẽ được gán trong loan seed
      collateralInfo: {
        brand: 'Yamaha',
        model: 'Exciter 155',
        year: 2021,
        color: 'Đỏ đen',
        licensePlate: '51G1-888.99',
      },
      appraisedValue: 48000000,
      ltvRatio: 0.65,
      appraisalDate: new Date('2025-12-20'),
      appraisalNotes: 'Xe độ pô, tem đề can',
      storageLocation: 'Khu A - Dãy 2',
      receivedDate: new Date('2025-12-20'),
      images: [],
    },

    // --- Samsung Galaxy S23 Ultra (Đã trả) ---
    {
      ownerName: 'Dang Thi G',
      collateralTypeId: findType('Điện thoại')!,
      storeId: findStore('Hội Sở Chính'),
      status: 'RELEASED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        brand: 'Samsung',
        model: 'Galaxy S23 Ultra',
        storage: '512GB',
        color: 'Phantom Black',
        imei: '35987654...',
      },
      appraisedValue: 22000000,
      ltvRatio: 0.75,
      appraisalDate: new Date('2025-11-01'),
      appraisalNotes: 'Máy đẹp như mới',
      storageLocation: 'Đã trả khách',
      receivedDate: new Date('2025-11-01'),
      images: [],
    },

    // --- MacBook Pro M2 (Đang lưu kho) ---
    {
      ownerName: 'Vu Van H',
      collateralTypeId: findType('Laptop')!,
      storeId: findStore('Hội Sở Chính'),
      status: 'STORED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        brand: 'Apple',
        model: 'MacBook Pro 14"',
        cpu: 'M2 Pro',
        ram: '16GB',
        ssd: '512GB',
        cycle: 45, // Số lần sạc
      },
      appraisedValue: 45000000,
      ltvRatio: 0.7,
      appraisalDate: new Date(),
      appraisalNotes: 'Máy mới mua 6 tháng, fullbox',
      storageLocation: 'Tủ Laptop - Ngăn A1',
      receivedDate: new Date(),
      images: [],
    },

    // --- Xe máy Honda Wave (Đang lưu kho) ---
    {
      ownerName: 'Tran Van I',
      collateralTypeId: findType('Xe máy')!,
      storeId: findStore('Nguyễn Trãi'),
      status: 'STORED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        brand: 'Honda',
        model: 'Wave RSX',
        year: 2019,
        color: 'Đen',
        licensePlate: '59X1-234.56',
      },
      appraisedValue: 18000000,
      ltvRatio: 0.6,
      appraisalDate: new Date(),
      appraisalNotes: 'Xe cũ, máy êm',
      storageLocation: 'Khu C - Dãy 3',
      receivedDate: new Date(),
      images: [],
    },

    // --- Canon EOS R6 (Đang lưu kho) ---
    {
      ownerName: 'Le Van J',
      collateralTypeId: findType('Máy ảnh')!,
      storeId: findStore('Thủ Đức'),
      status: 'STORED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        brand: 'Canon',
        model: 'EOS R6',
        lens: 'RF 24-105mm f/4',
        shutterCount: 5000,
        accessories: ['Pin phụ', 'Sạc', 'Thẻ nhớ 128GB'],
      },
      appraisedValue: 55000000,
      ltvRatio: 0.65,
      appraisalDate: new Date(),
      appraisalNotes: 'Máy mới, đầy đủ phụ kiện',
      storageLocation: 'Tủ điện tử - Ngăn B2',
      receivedDate: new Date(),
      images: [],
    },

    // --- iPad Pro M1 (Đang đề xuất) ---
    {
      ownerName: 'Pham Thi K',
      collateralTypeId: findType('Điện thoại')!, // iPad vào loại điện thoại/tablet
      storeId: findStore('Tân Bình'),
      status: 'PROPOSED' as CollateralStatus,
      loanId: null,
      collateralInfo: {
        brand: 'Apple',
        model: 'iPad Pro 11"',
        storage: '256GB',
        year: 2021,
        accessories: ['Apple Pencil 2', 'Magic Keyboard'],
      },
      appraisedValue: 20000000,
      ltvRatio: 0.75,
      appraisalDate: new Date(),
      appraisalNotes: 'Máy đẹp, có bàn phím và bút',
      storageLocation: 'Chờ xác nhận',
      receivedDate: new Date(),
      images: [],
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
