import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { File as MulterFile } from 'multer';
import { PrismaService } from 'src/prisma/prisma.service';
import { CollateralQueryDTO } from './dto/request/collateral.query';
import { CreateCollateralDTO } from './dto/request/create-collateral.request';
import { UpdateLocationRequest } from './dto/request/update-location.request';
import { CreateLiquidationRequest } from './dto/request/liquidation.request';
import { SellCollateralRequest } from './dto/request/sell-collateral.request';
import { CollateralAssetResponse, LiquidationCollateralResponse } from './dto/response/collateral.response';
import { CollateralMapper } from './collateral.mapper';
import { BaseResult } from 'src/common/dto/base.response';
import {
  CollateralType,
  CollateralStatus,
  Prisma,
} from '../../../generated/prisma';
import { PatchCollateralDTO } from './dto/request/patch-collateral.request';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import pLimit from 'p-limit';
import { ImageItem } from 'src/common/interfaces/media.interface';

@Injectable()
export class CollateralService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(
    query: CollateralQueryDTO,
  ): Promise<BaseResult<CollateralAssetResponse[]>> {
    const { page = 1, limit = 20, status, collateralTypeId, loanId } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CollateralWhereInput = {};

    if (status) {
      where.status = status as CollateralStatus;
    }

    if (collateralTypeId) {
      where.collateralTypeId = collateralTypeId;
    }

    if (loanId) {
      where.loanId = loanId;
    }

    // Execute queries in parallel
    const [collaterals, totalItems] = await Promise.all([
      this.prisma.collateral.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.collateral.count({ where }),
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

  async findOne(id: string): Promise<BaseResult<CollateralAssetResponse>> {
    const collateral = await this.prisma.collateral.findUnique({
      where: { id },
    });

    if (!collateral) {
      throw new NotFoundException(`Collateral asset with ID ${id} not found`);
    }

    return {
      data: CollateralMapper.toResponse(collateral),
    };
  }

  async create(
    data: CreateCollateralDTO,
    files: MulterFile[],
  ): Promise<BaseResult<CollateralAssetResponse>> {
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

      if (!files || files.length === 0) {
        throw new BadRequestException('No files provided');
      }

      const folder = `pawnshop/${data.collateralTypeId.toString().toLowerCase()}/${data.ownerName.toLowerCase()}`;

      const limit = pLimit(3);

      const uploadResults = await Promise.all(
        files.map((file) =>
          limit(() => this.cloudinaryService.uploadFile(file, folder)),
        ),
      );

      const images = uploadResults.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
      }));

      const collateral = await this.prisma.collateral.create({
        data: {
          collateralTypeId: data.collateralTypeId,
          ownerName: data.ownerName,
          loanId: data.loanId || null,
          collateralInfo: data.collateralInfo as Prisma.InputJsonValue,
          images: images as Prisma.InputJsonValue,
          status:
            (data.status as CollateralStatus) || CollateralStatus.PROPOSED,
          storageLocation: data.storageLocation,
          receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
        },
      });

      return {
        data: CollateralMapper.toResponse(collateral),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create collateral asset');
    }
  }

  async update(
    id: string,
    data: PatchCollateralDTO,
    files?: MulterFile[],
  ): Promise<BaseResult<CollateralAssetResponse>> {
    // Check if collateral exists
    const existing = await this.prisma.collateral.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Collateral asset with ID ${id} not found`);
    }

    try {
      const updateData: Prisma.CollateralUpdateInput = {};

      if (data.status !== undefined)
        updateData.status = data.status as CollateralStatus;
      if (data.appraisedValue !== undefined)
        updateData.appraisedValue = data.appraisedValue;
      if (data.appraisalNotes !== undefined)
        updateData.appraisalNotes = data.appraisalNotes;
      if (data.sellPrice !== undefined) updateData.sellPrice = data.sellPrice;

      if (data.collateralInfo !== undefined) {
        updateData.collateralInfo =
          data.collateralInfo as Prisma.InputJsonValue;
      }

      if (files && files.length > 0) {
        const folder = `pawnshop/${existing.collateralTypeId.toString().toLowerCase()}/${existing.ownerName.toLowerCase()}`;

        const limit = pLimit(3);

        const uploadResults = await Promise.all(
          files.map((file) =>
            limit(() => this.cloudinaryService.uploadFile(file, folder)),
          ),
        );

        const images: ImageItem[] = uploadResults.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
        }));

        const currentImages = (existing.images as unknown as ImageItem[]) || [];

        const updatedImages = [...currentImages, ...images];

        updateData.images = updatedImages as unknown as Prisma.InputJsonValue;
      }

      const collateral = await this.prisma.collateral.update({
        where: { id },
        data: updateData,
      });

      return {
        data: CollateralMapper.toResponse(collateral),
      };
    } catch (error) {
      throw new BadRequestException('Failed to update collateral asset');
    }
  }

  async updateLocation(
    id: string,
    data: UpdateLocationRequest,
  ): Promise<BaseResult<boolean>> {
    // Check if collateral exists
    const existing = await this.prisma.collateral.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Collateral asset with ID ${id} not found`);
    }

    try {
      const updateData: Prisma.CollateralUpdateInput = {
        storageLocation: data.location,
      };

      if (data.status) updateData.status = data.status as CollateralStatus;
      await this.prisma.collateral.update({
        where: { id },
        data: updateData,
      });

      return { data: true };
    } catch (error) {
      throw new BadRequestException('Failed to update collateral location');
    }
  }

  async createLiquidation(data: CreateLiquidationRequest): 
  Promise<BaseResult<LiquidationCollateralResponse>> {
    // Validate collateral exists
    const collateral = await this.prisma.collateral.findUnique({
      where: { id: data.collateralId },
    });

    if (!collateral) {
      throw new NotFoundException(
        `Collateral asset with ID ${data.collateralId} not found`,
      );
    }

    if (collateral.loanId === null) {
      throw new BadRequestException(
        'Collateral is not associated with any loan, cannot proceed with liquidation',
      );
    }

    // Validate loan exists
    const loan = await this.prisma.loan.findUnique({
      where: { id: collateral.loanId },
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
      await this.prisma.collateral.update({
        where: { id: data.collateralId },
        data: {
          status: CollateralStatus.LIQUIDATING,
          sellPrice: data.minimumSalePrice,
        },
      });

      return {
        data: {
          message: 'Liquidation process started successfully',
          // i ain't creating a liquidation table, have fun with null liquidationId
          liquidationId: null,
          collateralAssetId: data.collateralId,
          status: collateral.status,
          createdAt: collateral.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to initiate liquidation process');
    }
  }

  async sellCollateral(
    id: string,
    data: SellCollateralRequest,
  ): Promise<BaseResult<CollateralAssetResponse>> {
    // Validate collateral exists
    const collateral = await this.prisma.collateral.findUnique({
      where: { id },
    });

    if (!collateral) {
      throw new NotFoundException(`Collateral asset with ID ${id} not found`);
    }

    // Check if collateral is in liquidating status
    if (collateral.status !== CollateralStatus.LIQUIDATING) {
      throw new BadRequestException(
        'Collateral must be in LIQUIDATING status to be sold',
      );
    }

    try {
      // Update collateral with sell price and status to SOLD
      const updatedCollateral = await this.prisma.collateral.update({
        where: { id },
        data: {
          sellPrice: data.sellPrice,
          sellDate: new Date(),
          status: CollateralStatus.SOLD,
        },
      });

      return {
        data: CollateralMapper.toResponse(updatedCollateral),
      };
    } catch (error) {
      throw new BadRequestException('Failed to sell collateral');
    }
  }
}
