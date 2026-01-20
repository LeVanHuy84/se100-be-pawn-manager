import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DisbursementRequestDto } from './dto/request/disbursement.request';
import { ListDisbursementsQuery } from './dto/request/disbursement.query';
import { BaseResult } from 'src/common/dto/base.response';
import { DisbursementListItem } from './dto/response/disbursement-list-item.response';
import { DisbursementDetailsResponse } from './dto/response/disbursement-details.response';
import {
  DisbursementMethod,
  LoanStatus,
  Prisma,
  AuditEntityType,
} from 'generated/prisma';
import { AuditActionEnum } from 'src/common/enums/audit-action.enum';

@Injectable()
export class DisbursementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate disbursement reference code
   * Format: DSB-YYYY-NNNNNN
   */
  private async generateDisbursementReferenceCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await tx.disbursementSequence.upsert({
      where: { year },
      create: { year, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `DSB-${year}-${sequence.value.toString().padStart(6, '0')}`;
  }

  /**
   * Create a new disbursement log
   */
  async createDisbursement(
    idempotencyKey: string,
    dto: DisbursementRequestDto,
  ): Promise<BaseResult<DisbursementDetailsResponse>> {
    // Check idempotency key
    if (!idempotencyKey) {
      throw new ConflictException('Idempotency-Key is required');
    }

    const existing = await this.prisma.disbursement.findFirst({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Duplicate disbursement (Idempotency-Key already used)',
      );
    }

    // Verify loan exists and is ACTIVE
    const loan = await this.prisma.loan.findUnique({
      where: { id: dto.loanId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException(`Loan with ID ${dto.loanId} not found`);
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot disburse for loan with status ${loan.status}. Loan must be ACTIVE.`,
      );
    }

    // Create disbursement in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const referenceCode = await this.generateDisbursementReferenceCode(tx);

      const disbursement = await tx.disbursement.create({
        data: {
          idempotencyKey,
          loanId: dto.loanId,
          amount: Math.ceil(dto.amount), // Round up disbursement amount
          disbursementMethod: dto.disbursementMethod,
          referenceCode,
          disbursedBy: dto.disbursedBy,
          recipientName: dto.recipientName,
          recipientIdNumber: dto.recipientIdNumber,
          witnessName: dto.witnessName,
          notes: dto.notes,
          bankTransferRef: dto.bankTransferRef,
          bankAccountNumber: dto.bankAccountNumber,
          bankName: dto.bankName,
          storeId: dto.storeId,
          disbursedAt: new Date(),
        },
        include: {
          loan: {
            select: {
              loanCode: true,
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: AuditActionEnum.CREATE_DISBURSEMENT,
          entityId: disbursement.id,
          entityType: AuditEntityType.DISBURSEMENT,
          entityName: disbursement.referenceCode || disbursement.id,
          actorId: dto.disbursedBy || 'SYSTEM',
          actorName: dto.disbursedBy || 'System',
          newValue: {
            loanId: disbursement.loanId,
            amount: Number(disbursement.amount),
            disbursementMethod: disbursement.disbursementMethod,
            recipientName: disbursement.recipientName,
            recipientIdNumber: disbursement.recipientIdNumber,
            witnessName: disbursement.witnessName,
            bankTransferRef: disbursement.bankTransferRef,
            bankAccountNumber: disbursement.bankAccountNumber,
            bankName: disbursement.bankName,
          },
          description: `Created disbursement ${disbursement.referenceCode} for loan ${disbursement.loan.loanCode}`,
        },
      });

      // Update Loan startDate
      await tx.loan.update({
        where: { id: dto.loanId },
        data: {
          startDate: new Date(),
        },
      });

      return disbursement;
    });

    return {
      data: {
        id: result.id,
        loanId: result.loanId,
        loanCode: result.loan.loanCode,
        amount: Number(result.amount),
        disbursementMethod: result.disbursementMethod,
        disbursedAt: result.disbursedAt.toISOString(),
        referenceCode: result.referenceCode,
        disbursedBy: result.disbursedBy,
        recipientName: result.recipientName,
        recipientIdNumber: result.recipientIdNumber,
        witnessName: result.witnessName,
        notes: result.notes,
        bankTransferRef: result.bankTransferRef,
        bankAccountNumber: result.bankAccountNumber,
        bankName: result.bankName,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        customer: result.loan.customer,
      },
    };
  }

  /**
   * List disbursements with pagination and filters
   */
  async listDisbursements(
    query: ListDisbursementsQuery,
  ): Promise<BaseResult<DisbursementListItem[]>> {
    const page = query.page ? Number(query.page) || 1 : 1;
    const limit = query.limit ? Number(query.limit) || 20 : 20;

    const {
      loanId,
      storeId,
      disbursementMethod,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      recipientName,
      search,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.DisbursementWhereInput = {};

    if (loanId) where.loanId = loanId;
    if (storeId) where.storeId = storeId;
    if (disbursementMethod)
      where.disbursementMethod = disbursementMethod as DisbursementMethod;

    if (dateFrom || dateTo) {
      where.disbursedAt = {};
      if (dateFrom) {
        (where.disbursedAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1); // inclusive dateTo
        (where.disbursedAt as Prisma.DateTimeFilter).lt = to;
      }
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount !== undefined) {
        (where.amount as Prisma.DecimalFilter).gte = minAmount;
      }
      if (maxAmount !== undefined) {
        (where.amount as Prisma.DecimalFilter).lte = maxAmount;
      }
    }

    if (recipientName) {
      where.recipientName = {
        contains: recipientName,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.OR = [
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { loan: { loanCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    const orderBy: Prisma.DisbursementOrderByWithRelationInput = {};
    if (sortBy === 'disbursedAt') {
      orderBy.disbursedAt = sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'amount') {
      orderBy.amount = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc'; // Default
    }

    const [disbursements, total] = await Promise.all([
      this.prisma.disbursement.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          loan: {
            select: {
              loanCode: true,
            },
          },
        },
      }),
      this.prisma.disbursement.count({ where }),
    ]);

    const items: DisbursementListItem[] = disbursements.map((d) => ({
      id: d.id,
      loanId: d.loanId,
      amount: Number(d.amount),
      disbursementMethod: d.disbursementMethod,
      disbursedAt: d.disbursedAt.toISOString(),
      referenceCode: d.referenceCode,
      recipientName: d.recipientName,
      disbursedBy: d.disbursedBy,
      notes: d.notes,
      loanCode: d.loan.loanCode,
      createdAt: d.createdAt.toISOString(),
    }));

    return {
      data: items,
      meta: {
        totalItems: total,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
