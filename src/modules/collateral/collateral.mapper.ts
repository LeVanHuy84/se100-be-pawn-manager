import { Collateral } from '../../../generated/prisma';
import { CollateralAssetResponse } from './dto/response/collateral.response';

export class CollateralMapper {
  static toResponse(collateral: Collateral): CollateralAssetResponse {
    return {
      id: collateral.id,
      collateralTypeId: collateral.collateralTypeId,
      ownerName: collateral.ownerName,
      status: collateral.status,
      loanId: collateral.loanId,
      storageLocation: collateral.storageLocation,
      receivedDate: collateral.receivedDate?.toISOString().split('T')[0] || null,
      appraisedValue: collateral.appraisedValue ? Number(collateral.appraisedValue) : null,
      ltvRatio: collateral.ltvRatio ? Number(collateral.ltvRatio) : null,
      appraisalDate: collateral.appraisalDate?.toISOString() || null,
      appraisalNotes: collateral.appraisalNotes,
      sellPrice: collateral.sellPrice ? Number(collateral.sellPrice) : null,
      sellDate: collateral.sellDate?.toISOString().split('T')[0] || null,
      createdAt: collateral.createdAt.toISOString(),
      updatedAt: collateral.updatedAt.toISOString(),
    };
  }

  static toResponseList(collaterals: Collateral[]): CollateralAssetResponse[] {
    return collaterals.map(c => this.toResponse(c));
  }
}
