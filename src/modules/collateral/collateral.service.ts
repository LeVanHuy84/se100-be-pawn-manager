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
import {
  CollateralAssetResponse,
  LiquidationCollateralResponse,
} from './dto/response/collateral.response';
import { CollateralMapper } from './collateral.mapper';
import { BaseResult } from 'src/common/dto/base.response';
import {
  CollateralType,
  CollateralStatus,
  Prisma,
  AuditEntityType,
} from '../../../generated/prisma';
import { PatchCollateralDTO } from './dto/request/patch-collateral.request';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import pLimit from 'p-limit';
import { ImageItem } from 'src/common/interfaces/media.interface';
import { CurrentUserInfo } from 'src/common/decorators/current-user.decorator';
import { Decimal } from 'generated/prisma/runtime/library';
import { PaymentService } from '../payment/payment.service';
import { DisbursementService } from '../disbursement/disbursement.service';

@Injectable()
export class CollateralService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private paymentService: PaymentService,
    private disbursementService: DisbursementService,
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
    user?: CurrentUserInfo,
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

      const collateral = await this.prisma.$transaction(async (tx) => {
        const newCollateral = await tx.collateral.create({
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

        await tx.auditLog.create({
          data: {
            action: 'CREATE_COLLATERAL',
            entityId: newCollateral.id,
            entityType: AuditEntityType.COLLATERAL,
            entityName: `${data.ownerName} - ${newCollateral.id.substring(0, 8)}`,
            actorId: user?.userId || null,
            actorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
            oldValue: {},
            newValue: {
              collateralTypeId: data.collateralTypeId,
              ownerName: data.ownerName,
              loanId: data.loanId,
              status: newCollateral.status,
              storageLocation: data.storageLocation,
            },
            description: `Tạo mới tài sản thế chấp cho ${data.ownerName}`,
          },
        });

        return newCollateral;
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
    files?: MulterFile[],    user?: CurrentUserInfo,  ): Promise<BaseResult<CollateralAssetResponse>> {
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

      const collateral = await this.prisma.$transaction(async (tx) => {
        const updatedCollateral = await tx.collateral.update({
          where: { id },
          data: updateData,
        });

        // Log only changed fields
        const oldValue: Record<string, any> = {};
        const newValue: Record<string, any> = {};

        if (data.status !== undefined && existing.status !== data.status) {
          oldValue.status = existing.status;
          newValue.status = data.status;
        }
        if (data.appraisedValue !== undefined && existing.appraisedValue !== data.appraisedValue as unknown as Decimal) {
          oldValue.appraisedValue = existing.appraisedValue;
          newValue.appraisedValue = data.appraisedValue;
        }
        if (data.appraisalNotes !== undefined && existing.appraisalNotes !== data.appraisalNotes) {
          oldValue.appraisalNotes = existing.appraisalNotes;
          newValue.appraisalNotes = data.appraisalNotes;
        }
        if (data.sellPrice !== undefined && existing.sellPrice !== data.sellPrice as unknown as Decimal) {
          oldValue.sellPrice = existing.sellPrice;
          newValue.sellPrice = data.sellPrice;
        }
        if (data.collateralInfo !== undefined) {
          oldValue.collateralInfo = existing.collateralInfo;
          newValue.collateralInfo = data.collateralInfo;
        }
        if (files && files.length > 0) {
          newValue.imagesAdded = files.length;
        }

        if (Object.keys(newValue).length > 0) {
          await tx.auditLog.create({
            data: {
              action: 'UPDATE_COLLATERAL',
              entityId: id,
              entityType: AuditEntityType.COLLATERAL,
              entityName: `${existing.ownerName} - ${id.substring(0, 8)}`,
              actorId: user?.userId || null,
              actorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
              oldValue,
              newValue,
              description: `Cập nhật thông tin tài sản thế chấp ${existing.ownerName}`,
            },
          });
        }

        return updatedCollateral;
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
    user?: CurrentUserInfo,
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
      
      await this.prisma.$transaction(async (tx) => {
        await tx.collateral.update({
          where: { id },
          data: updateData,
        });

        const oldValue: Record<string, any> = {
          storageLocation: existing.storageLocation,
        };
        const newValue: Record<string, any> = {
          storageLocation: data.location,
        };

        if (data.status && existing.status !== data.status) {
          oldValue.status = existing.status;
          newValue.status = data.status;
        }

        await tx.auditLog.create({
          data: {
            action: 'UPDATE_COLLATERAL_LOCATION',
            entityId: id,
            entityType: AuditEntityType.COLLATERAL,
            entityName: `${existing.ownerName} - ${id.substring(0, 8)}`,
            actorId: user?.userId || null,
            actorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
            oldValue,
            newValue,
            description: `Cập nhật vị trí lưu trữ: ${data.location}`,
          },
        });
      });

      return { data: true };
    } catch (error) {
      throw new BadRequestException('Failed to update collateral location');
    }
  }

  async createLiquidation(
    data: CreateLiquidationRequest,
    user?: CurrentUserInfo,
  ): Promise<BaseResult<LiquidationCollateralResponse>> {
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
      await this.prisma.$transaction(async (tx) => {
        await tx.collateral.update({
          where: { id: data.collateralId },
          data: {
            status: CollateralStatus.LIQUIDATING,
            sellPrice: data.minimumSalePrice,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'START_LIQUIDATION',
            entityId: data.collateralId,
            entityType: AuditEntityType.COLLATERAL,
            entityName: `${collateral.ownerName} - ${data.collateralId.substring(0, 8)}`,
            actorId: user?.userId || null,
            actorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
            oldValue: {
              status: collateral.status,
              sellPrice: collateral.sellPrice,
            },
            newValue: {
              status: CollateralStatus.LIQUIDATING,
              minimumSalePrice: data.minimumSalePrice,
            },
            description: `Bắt đầu thanh lý tài sản với giá tối thiểu ${data.minimumSalePrice}`,
          },
        });
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
    user?: CurrentUserInfo,
  ): Promise<BaseResult<CollateralAssetResponse>> {
    // Validate collateral exists
    const collateral = await this.prisma.collateral.findUnique({
      where: { id },
      include: {
        loan: {
          select: {
            id: true,
            customerId: true,
            storeId: true,
            customer: {
              select: {
                fullName: true,
                nationalId: true,
              },
            },
          },
        },
      },
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

    if (!collateral.loan) {
      throw new BadRequestException(
        'Collateral must be associated with a loan',
      );
    }

    try {
      // Process liquidation payment through payment service
      // This will calculate outstanding, apply payment to loan, and return excess amount
      const paymentResult = await this.paymentService.processLiquidationPayment(
        {
          collateralId: id,
          sellPrice: data.sellPrice,
          paymentMethod: data.paymentMethod || 'CASH',
          notes: `Bán tài sản thế chấp thanh lý`,
        },
        { id: user?.userId, name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined },
      );

      // If there's excess amount, create disbursement to return to customer
      if (paymentResult.excessAmount > 0) {
        const idempotencyKey = `liquidation-excess-${id}-${Date.now()}`;
        await this.disbursementService.createDisbursement(idempotencyKey, {
          loanId: collateral.loan.id,
          storeId: collateral.loan.storeId,
          amount: paymentResult.excessAmount,
          disbursementMethod: data.paymentMethod || 'CASH',
          disbursedBy: user?.userId,
          recipientName: collateral.loan.customer.fullName,
          recipientIdNumber: collateral.loan.customer.nationalId,
          notes: `Hoàn trả tiền dư từ thanh lý tài sản ${id}`,
        });
      }

      // Get updated collateral
      const updatedCollateral = await this.prisma.collateral.findUnique({
        where: { id },
      });

      if (!updatedCollateral) {
        throw new NotFoundException(
          `Collateral asset with ID ${id} not found after update`,
        );
      }

      return {
        data: CollateralMapper.toResponse(updatedCollateral),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to sell collateral: ${error.message}`,
      );
    }
  }
}
