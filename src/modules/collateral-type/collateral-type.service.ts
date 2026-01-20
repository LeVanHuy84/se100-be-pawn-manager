import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CollateralTypeQueryDTO } from './dto/request/collateral-type.query';
import { CreateCollateralTypeDTO } from './dto/request/create-collateral-type.request';
import { UpdateCollateralTypeDTO } from './dto/request/update-collateral-type.request';
import { CollateralTypeResponse } from './dto/response/collateral-type.response';
import { CollateralTypeMapper } from './collateral-type.mapper';
import { BaseResult } from 'src/common/dto/base.response';
import { Prisma, AuditEntityType } from '../../../generated/prisma';
import { Decimal } from 'generated/prisma/runtime/library';
import { CurrentUserInfo } from 'src/common/decorators/current-user.decorator';

@Injectable()
export class CollateralTypeService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: CollateralTypeQueryDTO,
  ): Promise<BaseResult<CollateralTypeResponse[]>> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CollateralTypeWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [collateralTypes, totalItems] = await Promise.all([
      this.prisma.collateralType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          _count: {
            select: {
              collaterals: true,
            },
          },
        },
      }),
      this.prisma.collateralType.count({ where }),
    ]);

    return {
      data: CollateralTypeMapper.toResponseList(collateralTypes),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async findOne(id: number): Promise<BaseResult<CollateralTypeResponse>> {
    const collateralType = await this.prisma.collateralType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            collaterals: true,
          },
        },
      },
    });

    if (!collateralType) {
      throw new NotFoundException(`Collateral type with ID ${id} not found`);
    }

    return {
      data: CollateralTypeMapper.toResponse(collateralType),
    };
  }

  async create(
    data: CreateCollateralTypeDTO,
    user?: CurrentUserInfo,
  ): Promise<BaseResult<CollateralTypeResponse>> {
    try {
      // Check for duplicate name
      const existing = await this.prisma.collateralType.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          'Collateral type with this name already exists',
        );
      }

      const collateralType = await this.prisma.$transaction(async (tx) => {
        const newCollateralType = await tx.collateralType.create({
          data: {
            name: data.name,
            custodyFeeRateMonthly: data.custodyFeeRateMonthly || 0,
          },
          include: {
            _count: {
              select: {
                collaterals: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'CREATE_COLLATERAL_TYPE',
            entityId: newCollateralType.id.toString(),
            entityType: AuditEntityType.COLLATERAL,
            entityName: data.name,
            actorId: user?.userId || null,
            actorName: user
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
              : null,
            oldValue: {},
            newValue: {
              name: data.name,
              custodyFeeRateMonthly: data.custodyFeeRateMonthly || 0,
            },
            description: `Tạo loại tài sản thế chấp mới: ${data.name}`,
          },
        });

        return newCollateralType;
      });

      return {
        data: CollateralTypeMapper.toResponse(collateralType),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create collateral type');
    }
  }

  async update(
    id: number,
    data: UpdateCollateralTypeDTO,
    user?: CurrentUserInfo,
  ): Promise<BaseResult<CollateralTypeResponse>> {
    const existing = await this.prisma.collateralType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Collateral type with ID ${id} not found`);
    }

    // Check for duplicate name (excluding current type)
    if (data.name) {
      const duplicate = await this.prisma.collateralType.findFirst({
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
          'Another collateral type with this name already exists',
        );
      }
    }

    try {
      const updateData: Prisma.CollateralTypeUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.custodyFeeRateMonthly !== undefined)
        updateData.custodyFeeRateMonthly = data.custodyFeeRateMonthly;

      const collateralType = await this.prisma.$transaction(async (tx) => {
        const updatedCollateralType = await tx.collateralType.update({
          where: { id },
          data: updateData,
          include: {
            _count: {
              select: {
                collaterals: true,
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
        if (
          data.custodyFeeRateMonthly !== undefined &&
          existing.custodyFeeRateMonthly !==
            (data.custodyFeeRateMonthly as unknown as Decimal)
        ) {
          oldValue.custodyFeeRateMonthly = existing.custodyFeeRateMonthly;
          newValue.custodyFeeRateMonthly = data.custodyFeeRateMonthly;
        }

        if (Object.keys(newValue).length > 0) {
          await tx.auditLog.create({
            data: {
              action: 'UPDATE_COLLATERAL_TYPE',
              entityId: id.toString(),
              entityType: AuditEntityType.COLLATERAL,
              entityName: existing.name,
              actorId: user?.userId || null,
              actorName: user
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : null,
              oldValue,
              newValue,
              description: `Cập nhật loại tài sản thế chấp: ${existing.name}`,
            },
          });
        }

        return updatedCollateralType;
      });

      return {
        data: CollateralTypeMapper.toResponse(collateralType),
      };
    } catch (error) {
      throw new BadRequestException('Failed to update collateral type');
    }
  }
}
