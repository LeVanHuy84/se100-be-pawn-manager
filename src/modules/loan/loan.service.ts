import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListLoansQuery } from './dto/request/loan.query';
import { LoanStatus, Prisma } from 'generated/prisma';
import { LoanMapper } from './loan.mapper';
import { BaseResult } from 'src/common/dto/base.response';
import {
  LoanResponseDto,
  LoanSummaryResponseDto,
} from './dto/response/loan.response';

@Injectable()
export class LoanService {
  constructor(private readonly prisma: PrismaService) {}

  async listLoans(
    dto: ListLoansQuery,
  ): Promise<BaseResult<LoanSummaryResponseDto[]>> {
    const { storeId, status, customerId, page = 1, limit = 20 } = dto;

    const where: Prisma.LoanWhereInput = {};

    if (storeId) where.storeId = storeId;
    if (status) where.status = status as LoanStatus;
    if (customerId) where.customerId = customerId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          loanType: true,
        },
      }),
      this.prisma.loan.count({ where }),
    ]);

    return {
      data: LoanMapper.toLoanSummaryResponseList(items),
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  // get loan by id
  async getLoanById(id: string): Promise<LoanResponseDto> {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        loanType: true,
        collaterals: true,
        customer: true,
        store: true,
      },
    });
    return LoanMapper.toLoanResponse(loan);
  }
}
