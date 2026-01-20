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
  CollateralStatus,
  Prisma,
  RepaymentItemStatus,
  RevenueType,
  LoanStatus,
  PaymentType,
  PaymentMethod,
  PaymentComponent,
  DisbursementMethod,
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
    userId?: string,
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
          appraisedValue: data.appraisedValue,
          appraisalDate: data.appraisalDate
            ? new Date(data.appraisalDate)
            : new Date(),
          appraisalNotes: data.appraisalNotes,
        },
      });

      const response = CollateralMapper.toResponse(collateral);

      // Create Audit Log
      await this.prisma.auditLog.create({
        data: {
          action: 'CREATE_COLLATERAL',
          entityId: collateral.id,
          entityType: 'COLLATERAL',
          entityName: collateral.id,
          actorId: userId || null,
          actorName: userId ? 'STAFF' : 'SYSTEM',
          newValue: collateral as unknown as Prisma.InputJsonValue,
          description: `Created collateral asset for owner ${data.ownerName}`,
        },
      });

      return {
        data: response,
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
    user?: CurrentUserInfo,
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
        if (
          data.appraisedValue !== undefined &&
          existing.appraisedValue !==
            (data.appraisedValue as unknown as Decimal)
        ) {
          oldValue.appraisedValue = existing.appraisedValue;
          newValue.appraisedValue = data.appraisedValue;
        }
        if (
          data.appraisalNotes !== undefined &&
          existing.appraisalNotes !== data.appraisalNotes
        ) {
          oldValue.appraisalNotes = existing.appraisalNotes;
          newValue.appraisalNotes = data.appraisalNotes;
        }
        if (
          data.sellPrice !== undefined &&
          existing.sellPrice !== (data.sellPrice as unknown as Decimal)
        ) {
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
              actorName: user
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : null,
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
    } catch {
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
            actorName: user
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
              : null,
            oldValue,
            newValue,
            description: `Cập nhật vị trí lưu trữ: ${data.location}`,
          },
        });
      });

      return { data: true };
    } catch {
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
            actorName: user
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
              : null,
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
    } catch {
      throw new BadRequestException('Failed to initiate liquidation process');
    }
  }

  async sellCollateral(
    id: string,
    data: SellCollateralRequest,
    user?: CurrentUserInfo,
  ): Promise<BaseResult<CollateralAssetResponse>> {
    // Validate collateral exists with loan and schedule included
    const collateral = await this.prisma.collateral.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            repaymentSchedule: true,
            customer: true,
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
        'Collateral is not associated with any loan',
      );
    }

    const loan = collateral.loan;
    const sellPrice = data.sellPrice;

    // Calculate total outstanding debt from repayment schedule
    const scheduleItems = loan.repaymentSchedule;
    let totalDebt = 0;
    let totalInterest = 0;
    let totalFees = 0;
    let totalPenalty = 0;
    let totalPrincipal = 0;

    for (const item of scheduleItems) {
      const interestOut = Math.max(
        0,
        Number(item.interestAmount) - Number(item.paidInterest || 0),
      );
      const feeOut = Math.max(
        0,
        Number(item.feeAmount) - Number(item.paidFee || 0),
      );
      const penaltyOut = Math.max(
        0,
        Number(item.penaltyAmount) - Number(item.paidPenalty || 0),
      );
      const principalOut = Math.max(
        0,
        Number(item.principalAmount) - Number(item.paidPrincipal || 0),
      );

      totalInterest += interestOut;
      totalFees += feeOut;
      totalPenalty += penaltyOut;
      totalPrincipal += principalOut;
      totalDebt += interestOut + feeOut + penaltyOut + principalOut;
    }

    // Validate that sell price covers the debt
    if (sellPrice < totalDebt) {
      throw new BadRequestException(
        `Sell price (${sellPrice}) must be greater than or equal to total debt (${Math.round(totalDebt)}). We do not handle partial debt coverage.`,
      );
    }

    // Calculate excess amount to refund to customer
    const excessAmount = sellPrice - totalDebt;

    try {
      // Execute everything in a transaction
      const updatedCollateral = await this.prisma.$transaction(async (tx) => {
        // 1. Update collateral status to SOLD
        const soldCollateral = await tx.collateral.update({
          where: { id },
          data: {
            sellPrice: sellPrice,
            sellDate: new Date(),
            status: CollateralStatus.SOLD,
          },
        });

        // 2. Mark all unpaid schedule items as PAID (settling the debt)
        for (const item of scheduleItems) {
          if (item.status !== RepaymentItemStatus.PAID) {
            await tx.repaymentScheduleDetail.update({
              where: { id: item.id },
              data: {
                status: RepaymentItemStatus.PAID,
                paidPrincipal: Number(item.principalAmount),
                paidInterest: Number(item.interestAmount),
                paidFee: Number(item.feeAmount),
                paidPenalty: Number(item.penaltyAmount),
                paidAt: new Date(),
              },
            });
          }
        }

        // 3. Close the loan
        await tx.loan.update({
          where: { id: loan.id },
          data: {
            status: LoanStatus.CLOSED,
            remainingAmount: 0,
            updatedAt: new Date(),
          },
        });

        // 4. Generate payment reference code
        const year = new Date().getFullYear();
        const paymentSequence = await tx.paymentSequence.upsert({
          where: { year },
          create: { year, value: 1 },
          update: { value: { increment: 1 } },
        });
        const paymentRefCode = `PAY-LIQ-${year}-${paymentSequence.value.toString().padStart(6, '0')}`;

        // 5. Create LoanPayment record for the debt payoff (MONEY IN from asset sale)
        const loanPayment = await tx.loanPayment.create({
          data: {
            loanId: loan.id,
            storeId: loan.storeId,
            amount: Math.round(totalDebt), // The debt portion paid off
            paymentType: PaymentType.PAYOFF,
            paymentMethod: PaymentMethod.CASH, // Liquidation treated as cash
            referenceCode: paymentRefCode,
            idempotencyKey: `LIQUIDATION-${id}-${Date.now()}`,
            recorderEmployeeId: null, // System action
          },
        });

        // 6. Create PaymentAllocations (breakdown of how the debt was paid)
        const allocations: {
          componentType: PaymentComponent;
          amount: number;
        }[] = [];

        if (totalPenalty > 0) {
          allocations.push({
            componentType: PaymentComponent.LATE_FEE,
            amount: Math.round(totalPenalty),
          });
        }
        if (totalInterest > 0) {
          allocations.push({
            componentType: PaymentComponent.INTEREST,
            amount: Math.round(totalInterest),
          });
        }
        if (totalFees > 0) {
          allocations.push({
            componentType: PaymentComponent.SERVICE_FEE,
            amount: Math.round(totalFees),
          });
        }
        if (totalPrincipal > 0) {
          allocations.push({
            componentType: PaymentComponent.PRINCIPAL,
            amount: Math.round(totalPrincipal),
          });
        }

        for (const alloc of allocations) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: loanPayment.id,
              componentType: alloc.componentType,
              amount: alloc.amount,
              note: `Thanh lý tài sản - ${alloc.componentType}`,
            },
          });
        }

        // 7. Record revenue in ledger (for revenue reports)
        // Record revenue components (Interest, Fees, Penalties earned)
        if (totalInterest > 0) {
          await tx.revenueLedger.create({
            data: {
              type: RevenueType.INTEREST,
              amount: Math.round(totalInterest),
              refId: loanPayment.id,
              storeId: loan.storeId,
            },
          });
        }

        if (totalFees > 0) {
          await tx.revenueLedger.create({
            data: {
              type: RevenueType.SERVICE_FEE,
              amount: Math.round(totalFees),
              refId: loanPayment.id,
              storeId: loan.storeId,
            },
          });
        }

        if (totalPenalty > 0) {
          await tx.revenueLedger.create({
            data: {
              type: RevenueType.LATE_FEE,
              amount: Math.round(totalPenalty),
              refId: loanPayment.id,
              storeId: loan.storeId,
            },
          });
        }

        // 8. If there's excess, create a Disbursement to refund the customer (MONEY OUT)
        if (excessAmount > 0) {
          // Generate disbursement reference code
          const disbursementSequence = await tx.disbursementSequence.upsert({
            where: { year },
            create: { year, value: 1 },
            update: { value: { increment: 1 } },
          });
          const disbursementRefCode = `DSB-LIQ-${year}-${disbursementSequence.value.toString().padStart(6, '0')}`;

          await tx.disbursement.create({
            data: {
              loanId: loan.id,
              storeId: loan.storeId,
              amount: Math.round(excessAmount),
              disbursementMethod: DisbursementMethod.CASH,
              referenceCode: disbursementRefCode,
              idempotencyKey: `LIQUIDATION-REFUND-${id}-${Date.now()}`,
              disbursedBy: null, // System action
              recipientName: loan.customer?.fullName || collateral.ownerName,
              recipientIdNumber: loan.customer?.nationalId || null,
              notes: `Hoàn trả tiền dư từ thanh lý tài sản. Giá bán: ${sellPrice.toLocaleString('vi-VN')} VND. Tổng nợ: ${Math.round(totalDebt).toLocaleString('vi-VN')} VND.`,
            },
          });

          // Record excess refund in revenue ledger (as negative/outflow for tracking)
          await tx.revenueLedger.create({
            data: {
              type: RevenueType.EXCESS_REFUND,
              amount: -Math.round(excessAmount), // Negative to indicate outflow
              refId: loan.id,
              storeId: loan.storeId,
            },
          });
        }

        // 9. Create Audit Log for liquidation closure
        await tx.auditLog.create({
          data: {
            action: 'LIQUIDATION_CLOSE',
            entityId: loan.id,
            entityType: 'LOAN',
            entityName: loan.loanCode,
            actorId: null, // System action
            actorName: 'SYSTEM',
            oldValue: {
              status: loan.status,
              remainingAmount: Number(loan.remainingAmount),
            },
            newValue: {
              status: 'CLOSED',
              remainingAmount: 0,
              sellPrice: sellPrice,
              totalDebt: Math.round(totalDebt),
              excessRefund: Math.round(excessAmount),
              paymentId: loanPayment.id,
              paymentRefCode: paymentRefCode,
            },
            description: `Khoản vay ${loan.loanCode} được đóng thông qua thanh lý tài sản. Giá bán: ${sellPrice.toLocaleString('vi-VN')} VND. Tổng nợ: ${Math.round(totalDebt).toLocaleString('vi-VN')} VND. Hoàn trả khách: ${Math.round(excessAmount).toLocaleString('vi-VN')} VND.`,
          },
        });

        return soldCollateral;
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
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Failed to sell collateral:', error);
      throw new BadRequestException(
        'Failed to sell collateral and settle loan',
      );
    }
  }
}
