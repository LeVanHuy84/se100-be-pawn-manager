import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CollateralQueryDTO } from './dto/request/collateral.query';
import { CreateCollateralDTO } from './dto/request/create-collateral.request';
import { UpdateLocationRequest } from './dto/request/update-location.request';
import { CreateLiquidationRequest } from './dto/request/liquidation.request';
import { CollateralAssetResponse } from './dto/response/collateral.response';
import { CollateralMapper } from './collateral.mapper';
import { BaseResult } from 'src/common/dto/base.response';
import { AssetType, AssetStatus, Prisma } from '../../../generated/prisma';

@Injectable()
export class CollateralService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: CollateralQueryDTO,
  ): Promise<BaseResult<CollateralAssetResponse[]>> {
    const { page = 1, limit = 20, status, assetType, loanId, isSold } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CollateralAssetWhereInput = {};

    if (status) {
      where.status = status as AssetStatus;
    }

    if (assetType) {
      where.assetType = assetType as AssetType;
    }

    if (loanId) {
      where.loanId = loanId;
    }

    if (isSold !== undefined) {
      where.isSold = isSold;
    }

    // Execute queries in parallel
    const [collaterals, totalItems] = await Promise.all([
      this.prisma.collateralAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.collateralAsset.count({ where }),
    ]);

    return {
      data: CollateralMapper.toResponseList(collaterals),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async findOne(id: string): Promise<CollateralAssetResponse> {
    const collateral = await this.prisma.collateralAsset.findUnique({
      where: { id },
    });

    if (!collateral) {
      throw new NotFoundException(`Collateral asset with ID ${id} not found`);
    }

    return CollateralMapper.toResponse(collateral);
  }

  async create(data: CreateCollateralDTO): Promise<CollateralAssetResponse> {
    try {
      // Validate loanId if provided
      if (data.loanId) {
        const loan = await this.prisma.loan.findUnique({
          where: { id: data.loanId },
        });

        if (!loan) {
          throw new BadRequestException(
            `Loan with ID ${data.loanId} not found`,
          );
        }
      }

      const collateral = await this.prisma.collateralAsset.create({
        data: {
          assetType: data.assetType as AssetType,
          ownerName: data.ownerName,
          brandModel: data.brandModel,
          serialNumber: data.serialNumber,
          plateNumber: data.plateNumber,
          marketValue: data.marketValue,
          loanId: data.loanId || null,
          status: (data.status as AssetStatus) || AssetStatus.PROPOSED,
          storageLocation: data.storageLocation,
          receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
          releasedDate: data.releasedDate ? new Date(data.releasedDate) : null,
          isSold: false,
          validUntil: data.validUntil,
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
        },
      });

      return CollateralMapper.toResponse(collateral);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create collateral asset');
    }
  }

  async updateLocation(
    id: string,
    data: UpdateLocationRequest,
  ): Promise<boolean> {
    // Check if collateral exists
    const existing = await this.prisma.collateralAsset.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Collateral asset with ID ${id} not found`);
    }

    try {
      const updateData: Prisma.CollateralAssetUpdateInput = {
        storageLocation: data.storageLocation,
      };

      if (data.status) updateData.status = data.status as AssetStatus;

      await this.prisma.collateralAsset.update({
        where: { id },
        data: updateData,
      });

      return true;
    } catch (error) {
      throw new BadRequestException('Failed to update collateral location');
    }
  }

  async createLiquidation(data: CreateLiquidationRequest): Promise<{
    liquidationId: string | null;
    status: AssetStatus;
    createdAt: string;
    message: string;
    collateralAssetId: string;
  }> {
    // Validate collateral exists
    const collateral = await this.prisma.collateralAsset.findUnique({
      where: { id: data.collateralId },
    });

    if (!collateral) {
      throw new NotFoundException(
        `Collateral asset with ID ${data.collateralId} not found`,
      );
    }

    // Validate loan exists
    const loan = await this.prisma.loan.findUnique({
      where: { id: collateral.loanId || '' },
    });

    if (!loan) {
      throw new BadRequestException("Collateral's associated loan not found");
    }

    // Check if loan is eligible for liquidation (business rule)

    if (loan.status !== 'OVERDUE') {
      throw new BadRequestException(
        'Loan is not eligible for liquidation. Only OVERDUE loans can be liquidated.',
      );
    }

    try {
      // Update collateral status to indicate liquidation process started
      await this.prisma.collateralAsset.update({
        where: { id: data.collateralId },
        data: {
          status: AssetStatus.LIQUIDATING,
          sellPrice: data.minimumSalePrice,
          updatedBy: data.createdBy,
        },
      });

      return {
        message: 'Liquidation process started successfully',
        // i ain't creating a liquidation table, have fun with null liquidationId 
        liquidationId: null,
        collateralAssetId: data.collateralId,
        status: collateral.status,
        createdAt: collateral.updatedAt.toISOString(),
      };
    } catch (error) {
      throw new BadRequestException('Failed to initiate liquidation process');
    }
  }
}
