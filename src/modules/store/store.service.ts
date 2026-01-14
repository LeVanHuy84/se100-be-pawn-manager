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
import { Prisma } from '../../../generated/prisma';

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

  async findOne(id: string): Promise<StoreResponse> {
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

    return StoreMapper.toDetailResponse(store);
  }

  async create(data: CreateStoreDTO): Promise<StoreResponse> {
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

      const store = await this.prisma.store.create({
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

      return StoreMapper.toResponse(store);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create store');
    }
  }

  async update(id: string, data: UpdateStoreDTO): Promise<StoreResponse> {
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

    try {
      const updateData: Prisma.StoreUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.storeInfo !== undefined) {
        updateData.storeInfo = data.storeInfo as Prisma.InputJsonValue;
      }
      if (data.wardId !== undefined) updateData.ward = { connect: { id: data.wardId } };

      const store = await this.prisma.store.update({
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

      return StoreMapper.toResponse(store);
    } catch (error) {
      throw new BadRequestException('Failed to update store');
    }
  }
}
