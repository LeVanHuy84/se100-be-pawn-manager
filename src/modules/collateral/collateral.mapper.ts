import { CollateralAsset } from '../../../generated/prisma';
import { CollateralAssetResponse } from './dto/response/collateral.response';

export class CollateralMapper {
  static toResponse(collateral: CollateralAsset): CollateralAssetResponse {
    return {
      id: collateral.id,
      assetType: collateral.assetType,
      ownerName: collateral.ownerName,
      brandModel: collateral.brandModel || '',
      serialNumber: collateral.serialNumber,
      plateNumber: collateral.plateNumber,
      marketValue: collateral.marketValue ? Number(collateral.marketValue) : null,
      status: collateral.status,
      loanId: collateral.loanId,
      storageLocation: collateral.storageLocation,
      receivedDate: collateral.receivedDate?.toISOString().split('T')[0] || null,
      releasedDate: collateral.releasedDate?.toISOString().split('T')[0] || null,
      appraisedValue: collateral.appraisedValue ? Number(collateral.appraisedValue) : null,
      ltvRatio: collateral.ltvRatio ? Number(collateral.ltvRatio) : null,
      appraisalDate: collateral.appraisalDate?.toISOString() || null,
      appraisalNotes: collateral.appraisalNotes,
      validUntil: collateral.validUntil?.toISOString().split('T')[0] || null,
      sellPrice: collateral.sellPrice ? Number(collateral.sellPrice) : null,
      sellDate: collateral.sellDate?.toISOString().split('T')[0] || null,
      isSold: collateral.isSold,
      createdAt: collateral.createdAt.toISOString(),
      updatedAt: collateral.updatedAt.toISOString(),
      createdBy: collateral.createdBy,
      updatedBy: collateral.updatedBy,
    };
  }

  static toResponseList(collaterals: CollateralAsset[]): CollateralAssetResponse[] {
    return collaterals.map(c => this.toResponse(c));
  }
}
