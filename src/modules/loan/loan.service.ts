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
    const { q, storeId, status, customerId, page = 1, limit = 20 } = dto;

    const andConditions: Prisma.LoanWhereInput[] = [];

    if (storeId) {
      andConditions.push({ storeId });
    }

    if (status) {
      andConditions.push({ status: status as LoanStatus });
    }

    if (customerId) {
      andConditions.push({ customerId });
    }

    if (q) {
      andConditions.push({
        OR: [
          { loanCode: { contains: q, mode: 'insensitive' } },
          {
            customer: {
              fullName: { contains: q, mode: 'insensitive' },
            },
          },
          {
            customer: {
              phone: { contains: q },
            },
          },
          {
            customer: {
              email: { contains: q, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    const where: Prisma.LoanWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // --------------------------------------------------
    // QUERY DB
    // --------------------------------------------------
    const [items, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          loanType: true,
          customer: true,
        },
      }),
      this.prisma.loan.count({ where }),
    ]);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------
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
