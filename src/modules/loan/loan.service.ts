import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListLoansQuery } from './dto/request/loan.query';
import { LoanStatus, Prisma } from 'generated/prisma';
import { BaseResult } from 'src/common/dto/base.response';
import { LoanResponse } from './dto/response/loan.response';
import { LoanMapper } from './loan.mapper';

@Injectable()
export class LoanService {
  constructor(private readonly prisma: PrismaService) {}

  async listLoans(dto: ListLoansQuery): Promise<BaseResult<LoanResponse[]>> {
    const { status, customerId, page = 1, limit = 20 } = dto;

    const where: Prisma.LoanWhereInput = {};

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
          collaterals: true,
        },
      }),
      this.prisma.loan.count({ where }),
    ]);

    return {
      data: LoanMapper.toLoanResponseList(items),
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }
}
