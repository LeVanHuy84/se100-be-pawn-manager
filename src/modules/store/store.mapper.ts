import { Store, Location } from '../../../generated/prisma';
import { StoreResponse } from './dto/response/store.response';

type StoreWithRelations = Store & {
  ward?: (Location & { parent?: Location | null }) | null;
  _count?: {
    collaterals?: number;
    loans?: number;
  };
  loans?: any[];
};

export class StoreMapper {
  static toResponse(store: StoreWithRelations): StoreResponse {
    return {
      id: store.id,
      name: store.name,
      address: store.address || undefined,
      storeInfo: (store.storeInfo as Record<string, any>) || {},
      isActive: store.isActive,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
      wardId: store.wardId || undefined,
      wardName: store.ward?.name || undefined,
      provinceId: store.ward?.parent?.id || undefined,
      provinceName: store.ward?.parent?.name || undefined,
    };
  }

  static toDetailResponse(store: StoreWithRelations): StoreResponse {
    const response = this.toResponse(store);

    if (store._count) {
      response.totalCollaterals = store._count.collaterals || 0;
      response.totalLoans = store._count.loans || 0;
    }

    if (store.loans) {
      response.activeLoans = store.loans.filter(
        (loan) => loan.status === 'ACTIVE',
      ).length;
    }

    return response;
  }

  static toResponseList(stores: StoreWithRelations[]): StoreResponse[] {
    return stores.map((store) => this.toResponse(store));
  }
}
