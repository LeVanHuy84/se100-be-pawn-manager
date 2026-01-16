import { CollateralType } from '../../../generated/prisma';
import { CollateralTypeResponse } from './dto/response/collateral-type.response';

type CollateralTypeWithCount = CollateralType & {
  _count?: {
    collaterals?: number;
  };
};

export class CollateralTypeMapper {
  static toResponse(
    collateralType: CollateralTypeWithCount,
  ): CollateralTypeResponse {
    return {
      id: collateralType.id,
      name: collateralType.name,
      custodyFeeRateMonthly: Number(collateralType.custodyFeeRateMonthly),
      totalCollaterals: collateralType._count?.collaterals,
    };
  }

  static toResponseList(
    collateralTypes: CollateralTypeWithCount[],
  ): CollateralTypeResponse[] {
    return collateralTypes.map((type) => this.toResponse(type));
  }
}
