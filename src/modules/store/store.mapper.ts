import { Store } from '../../../generated/prisma';
import { StoreResponse } from './dto/response/store.response';

export class StoreMapper {
  static toResponse(store: Store): StoreResponse {
    return {
      id: store.id,
      name: store.name,
      address: store.address || undefined,
      storeInfo: (store.storeInfo as Record<string, any>) || {},
      isActive: store.isActive,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  static toDetailResponse(
    store: Store & {
      _count?: {
        collaterals?: number;
        loans?: number;
      };
      loans?: any[];
    },
  ): StoreResponse {
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

  static toResponseList(stores: Store[]): StoreResponse[] {
    return stores.map((store) => this.toResponse(store));
  }
}
