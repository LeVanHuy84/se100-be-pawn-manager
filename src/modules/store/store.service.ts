import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StoreQueryDTO } from './dto/request/store.query';
import { CreateStoreDTO } from './dto/request/create-store.request';
import { UpdateStoreDTO } from './dto/request/update-store.request';
import { StoreResponse } from './dto/response/store.response';
import { StoreMapper } from './store.mapper';
import { BaseResult } from 'src/common/dto/base.response';
import { Prisma, AuditEntityType } from '../../../generated/prisma';
import { CurrentUserInfo } from 'src/common/decorators/current-user.decorator';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: StoreQueryDTO): Promise<BaseResult<StoreResponse[]>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.StoreWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Execute queries in parallel
    const [stores, totalItems] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ward: {
            include: {
              parent: true,
            },
          },
        },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: StoreMapper.toResponseList(stores),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async findOne(id: string): Promise<BaseResult<StoreResponse>> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            collaterals: true,
            loans: true,
          },
        },
        loans: {
          select: {
            status: true,
          },
        },
        ward: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    return {
      data: StoreMapper.toDetailResponse(store),
    };
  }

  async create(data: CreateStoreDTO, user?: CurrentUserInfo): Promise<BaseResult<StoreResponse>> {
    try {
      // Check for duplicate store name
      const existing = await this.prisma.store.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
        },
      });

      if (existing) {
        throw new ConflictException('Store with this name already exists');
      }

      const location = await this.prisma.location.findFirst({
        where: { id: data.wardId },
      });

      if (location?.parentId == null) {
        throw new BadRequestException(
          'Invalid wardId: must be a ward-level location',
        );
      }

      const store = await this.prisma.$transaction(async (tx) => {
        const newStore = await tx.store.create({
          data: {
            name: data.name,
            address: data.address,
            storeInfo: (data.storeInfo || {}) as Prisma.InputJsonValue,
            isActive: data.isActive ?? true,
            wardId: data.wardId,
          },
          include: {
            ward: {
              include: {
                parent: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'CREATE_STORE',
            entityId: newStore.id,
            entityType: AuditEntityType.LOAN, // Note: Schema doesn't have STORE type, using LOAN as placeholder
            entityName: data.name,
            actorId: user?.userId || null,
            actorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
            oldValue: {},
            newValue: {
              name: data.name,
              address: data.address,
              isActive: data.isActive ?? true,
              wardId: data.wardId,
            },
            description: `Tạo cửa hàng mới: ${data.name}`,
          },
        });

        return newStore;
      });

      return { data: StoreMapper.toDetailResponse(store) };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create store');
    }
  }

  async update(
    id: string,
    data: UpdateStoreDTO,
    user?: CurrentUserInfo,
  ): Promise<BaseResult<StoreResponse>> {
    // Check if store exists
    const existing = await this.prisma.store.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    // Check for duplicate name (excluding current store)
    if (data.name) {
      const duplicate = await this.prisma.store.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              name: {
                equals: data.name,
                mode: 'insensitive',
              },
            },
          ],
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Another store with this name already exists',
        );
      }
    }

    if (data.wardId) {
      const location = await this.prisma.location.findFirst({
        where: { id: data.wardId },
      });

      if (location?.parentId == null) {
        throw new BadRequestException(
          'Invalid wardId: must be a ward-level location',
        );
      }
    }

    try {
      const updateData: Prisma.StoreUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.storeInfo !== undefined) {
        updateData.storeInfo = data.storeInfo as Prisma.InputJsonValue;
      }
      if (data.wardId !== undefined)
        updateData.ward = { connect: { id: data.wardId } };

      const store = await this.prisma.$transaction(async (tx) => {
        const updatedStore = await tx.store.update({
          where: { id },
          data: updateData,
          include: {
            ward: {
              include: {
                parent: true,
              },
            },
          },
        });

        // Log only changed fields
        const oldValue: Record<string, any> = {};
        const newValue: Record<string, any> = {};

        if (data.name !== undefined && existing.name !== data.name) {
          oldValue.name = existing.name;
          newValue.name = data.name;
        }
        if (data.address !== undefined && existing.address !== data.address) {
          oldValue.address = existing.address;
          newValue.address = data.address;
        }
        if (data.isActive !== undefined && existing.isActive !== data.isActive) {
          oldValue.isActive = existing.isActive;
          newValue.isActive = data.isActive;
        }
        if (data.storeInfo !== undefined) {
          oldValue.storeInfo = existing.storeInfo;
          newValue.storeInfo = data.storeInfo;
        }
        if (data.wardId !== undefined && existing.wardId !== data.wardId) {
          oldValue.wardId = existing.wardId;
          newValue.wardId = data.wardId;
        }

        if (Object.keys(newValue).length > 0) {
          await tx.auditLog.create({
            data: {
              action: 'UPDATE_STORE',
              entityId: id,
              entityType: AuditEntityType.LOAN, // Note: Schema doesn't have STORE type
              entityName: existing.name,
              actorId: user?.userId || null,
              actorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
              oldValue,
              newValue,
              description: `Cập nhật thông tin cửa hàng: ${existing.name}`,
            },
          });
        }

        return updatedStore;
      });

      return { data: StoreMapper.toDetailResponse(store) };
    } catch (error) {
      throw new BadRequestException('Failed to update store');
    }
  }
}
