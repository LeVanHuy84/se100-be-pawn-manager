import { PrismaClient } from '../../../generated/prisma';
import { AssetType, AssetStatus } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const collaterals = [
    { assetType: 'MOTORBIKE', ownerName: 'Nguyen Van A', brandModel: 'Honda Wave RSX', serialNumber: 'VN12345678', plateNumber: '59-X1 12345', status: 'PROPOSED', storageLocation: 'Warehouse A - Shelf 12', receivedDate: '2025-01-10', appraisedValue: 65000000, ltvRatio: 70, appraisalDate: '2025-01-10', appraisalNotes: 'Good condition', validUntil: '2025-07-10', salePrice: null, isSold: false },
    { assetType: 'CAR', ownerName: 'Tran Thi B', brandModel: 'Toyota Vios', serialNumber: 'VN87654321', plateNumber: '51A-98765', status: 'PLEDGED', storageLocation: 'Branch 1 - Lot 3', receivedDate: '2024-12-05', appraisedValue: 350000000, ltvRatio: 65, appraisalDate: '2024-12-05', appraisalNotes: 'Minor scratches', validUntil: '2025-06-05', salePrice: null, isSold: false },
    { assetType: 'GOLD', ownerName: 'Le Thi C', brandModel: '24K Necklace', serialNumber: null, plateNumber: null, status: 'STORED', storageLocation: 'Vault 2', receivedDate: '2025-02-01', appraisedValue: 12000000, ltvRatio: 80, appraisalDate: '2025-02-01', appraisalNotes: 'High purity', validUntil: '2025-08-01', salePrice: null, isSold: false },
    { assetType: 'OTHER', ownerName: 'Pham Van D', brandModel: 'Antique Watch', serialNumber: 'AW-2024-0001', plateNumber: null, status: 'PROPOSED', storageLocation: 'Warehouse B - Shelf 2', receivedDate: '2024-11-20', appraisedValue: 5000000, ltvRatio: 50, appraisalDate: '2024-11-20', appraisalNotes: 'Collector item', validUntil: '2025-05-20', salePrice: null, isSold: false },
    { assetType: 'MOTORBIKE', ownerName: 'Ngo Van F', brandModel: 'Yamaha Sirius', serialNumber: 'YS-2025-0001', plateNumber: '60B-11111', status: 'PLEDGED', storageLocation: 'Warehouse A - Shelf 3', receivedDate: '2025-03-01', appraisedValue: 22000000, ltvRatio: 72, appraisalDate: '2025-03-01', appraisalNotes: 'Good, recent service', validUntil: '2025-09-01', salePrice: null, isSold: false },
    { assetType: 'CAR', ownerName: 'Vu Van H', brandModel: 'Honda City', serialNumber: 'HC-2024-5555', plateNumber: '52C-22222', status: 'STORED', storageLocation: 'Branch 2 - Lot 1', receivedDate: '2025-02-20', appraisedValue: 420000000, ltvRatio: 60, appraisalDate: '2025-02-20', appraisalNotes: 'Well maintained', validUntil: '2025-08-20', salePrice: null, isSold: false },
    { assetType: 'GOLD', ownerName: 'Dang Thi G', brandModel: 'Gold Bracelet', serialNumber: null, plateNumber: null, status: 'STORED', storageLocation: 'Vault 1', receivedDate: '2025-03-10', appraisedValue: 8000000, ltvRatio: 75, appraisalDate: '2025-03-10', appraisalNotes: 'Good quality', validUntil: '2025-09-10', salePrice: null, isSold: false },
    { assetType: 'OTHER', ownerName: 'Tran Van I', brandModel: 'Laptop Dell XPS', serialNumber: 'DLX-2025-0099', plateNumber: null, status: 'PROPOSED', storageLocation: 'Warehouse C - Shelf 5', receivedDate: '2025-03-15', appraisedValue: 18000000, ltvRatio: 50, appraisalDate: '2025-03-15', appraisalNotes: 'Lightly used', validUntil: '2025-09-15', salePrice: null, isSold: false },
    { assetType: 'MOTORBIKE', ownerName: 'Le Van J', brandModel: 'Suzuki Raider', serialNumber: 'SR-2024-7777', plateNumber: '54D-33333', status: 'PLEDGED', storageLocation: 'Warehouse A - Shelf 8', receivedDate: '2024-10-10', appraisedValue: 30000000, ltvRatio: 68, appraisalDate: '2024-10-10', appraisalNotes: 'Good tires', validUntil: '2025-04-10', salePrice: null, isSold: false },
    { assetType: 'CAR', ownerName: 'Hoang Thi E', brandModel: 'Mazda 3', serialNumber: 'MZ-2023-4321', plateNumber: '63D-44444', status: 'PROPOSED', storageLocation: 'Branch 3 - Lot A', receivedDate: '2024-09-15', appraisedValue: 500000000, ltvRatio: 60, appraisalDate: '2024-09-15', appraisalNotes: 'Accident free', validUntil: '2025-03-15', salePrice: null, isSold: false },
    { assetType: 'GOLD', ownerName: 'Nguyen Van K', brandModel: 'Ring 18K', serialNumber: null, plateNumber: null, status: 'STORED', storageLocation: 'Vault 3', receivedDate: '2025-01-25', appraisedValue: 4000000, ltvRatio: 78, appraisalDate: '2025-01-25', appraisalNotes: 'Polished', validUntil: '2025-07-25', salePrice: null, isSold: false },
    { assetType: 'OTHER', ownerName: 'Pham Thi L', brandModel: 'Gold Watch', serialNumber: 'GW-2025-1001', plateNumber: null, status: 'PROPOSED', storageLocation: 'Warehouse D - Shelf 1', receivedDate: '2025-03-01', appraisedValue: 7500000, ltvRatio: 55, appraisalDate: '2025-03-01', appraisalNotes: 'Vintage', validUntil: '2025-09-01', salePrice: null, isSold: false },
    { assetType: 'MOTORBIKE', ownerName: 'Tran Van M', brandModel: 'Honda Blade', serialNumber: 'HB-2025-5001', plateNumber: '66A-55555', status: 'STORED', storageLocation: 'Warehouse E - Shelf 2', receivedDate: '2025-02-10', appraisedValue: 18500000, ltvRatio: 70, appraisalDate: '2025-02-10', appraisalNotes: 'Good', validUntil: '2025-08-10', salePrice: null, isSold: false },
    { assetType: 'CAR', ownerName: 'Le Thi N', brandModel: 'Kia Morning', serialNumber: 'KM-2024-8888', plateNumber: '70B-66666', status: 'PLEDGED', storageLocation: 'Branch 4 - Lot 2', receivedDate: '2024-12-01', appraisedValue: 260000000, ltvRatio: 63, appraisalDate: '2024-12-01', appraisalNotes: 'Clean title', validUntil: '2025-06-01', salePrice: null, isSold: false },
    { assetType: 'GOLD', ownerName: 'Hoang Van O', brandModel: 'Necklace 18K', serialNumber: null, plateNumber: null, status: 'STORED', storageLocation: 'Vault 2', receivedDate: '2025-02-28', appraisedValue: 9500000, ltvRatio: 76, appraisalDate: '2025-02-28', appraisalNotes: 'High grade', validUntil: '2025-08-28', salePrice: null, isSold: false },
    { assetType: 'OTHER', ownerName: 'Nguyen Thi P', brandModel: 'iPhone 13', serialNumber: 'IP13-2025-0012', plateNumber: null, status: 'PROPOSED', storageLocation: 'Warehouse F - Shelf 4', receivedDate: '2025-03-05', appraisedValue: 14000000, ltvRatio: 45, appraisalDate: '2025-03-05', appraisalNotes: 'Good condition', validUntil: '2025-09-05', salePrice: null, isSold: false },
    { assetType: 'MOTORBIKE', ownerName: 'Pham Quang Q', brandModel: 'Piaggio Vespa', serialNumber: 'PV-2025-0022', plateNumber: '77C-77777', status: 'STORED', storageLocation: 'Warehouse A - Shelf 4', receivedDate: '2025-01-20', appraisedValue: 55000000, ltvRatio: 65, appraisalDate: '2025-01-20', appraisalNotes: 'Classic', validUntil: '2025-07-20', salePrice: null, isSold: false },
    { assetType: 'CAR', ownerName: 'Le Binh R', brandModel: 'Ford Ranger', serialNumber: 'FR-2024-3333', plateNumber: '80D-88888', status: 'PLEDGED', storageLocation: 'Branch 5 - Lot 4', receivedDate: '2024-11-10', appraisedValue: 620000000, ltvRatio: 60, appraisalDate: '2024-11-10', appraisalNotes: 'Pickup truck', validUntil: '2025-05-10', salePrice: null, isSold: false },
  ];

  for (const c of collaterals) {
    // Determine a search clause to detect existing records without using id
    const whereClause: any = c.serialNumber
      ? { serialNumber: c.serialNumber }
      : c.plateNumber
      ? { plateNumber: c.plateNumber }
      : { ownerName: c.ownerName, brandModel: c.brandModel, receivedDate: c.receivedDate ? new Date(c.receivedDate) : null };

    const existing = await prisma.collateralAsset.findFirst({ where: whereClause });

    if (existing) {
      await prisma.collateralAsset.update({
        where: { id: existing.id },
        data: {
          assetType: c.assetType as AssetType,
          ownerName: c.ownerName,
          brandModel: c.brandModel,
          serialNumber: c.serialNumber,
          plateNumber: c.plateNumber,
          status: c.status as AssetStatus,
          storageLocation: c.storageLocation,
          receivedDate: c.receivedDate ? new Date(c.receivedDate) : null,
          appraisedValue: c.appraisedValue,
          ltvRatio: c.ltvRatio,
          appraisalDate: c.appraisalDate ? new Date(c.appraisalDate) : null,
          appraisalNotes: c.appraisalNotes,
          validUntil: c.validUntil ? new Date(c.validUntil) : null,
          sellPrice: c.salePrice,
          isSold: c.isSold,
        },
      });
    } else {
      await prisma.collateralAsset.create({
        data: {
          assetType: c.assetType as AssetType,
          ownerName: c.ownerName,
          brandModel: c.brandModel,
          serialNumber: c.serialNumber,
          plateNumber: c.plateNumber,
          status: c.status as AssetStatus,
          storageLocation: c.storageLocation,
          receivedDate: c.receivedDate ? new Date(c.receivedDate) : null,
          appraisedValue: c.appraisedValue,
          ltvRatio: c.ltvRatio,
          appraisalDate: c.appraisalDate ? new Date(c.appraisalDate) : null,
          appraisalNotes: c.appraisalNotes,
          validUntil: c.validUntil ? new Date(c.validUntil) : null,
          sellPrice: c.salePrice,
          isSold: c.isSold,
        },
      });
    }
  }

  console.log('Collateral seed finished');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
