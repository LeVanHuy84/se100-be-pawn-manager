import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractMapper } from './contract.mapper';
import { ContractResponse } from './dto/response/contract.response';
import { ContractQueryDto } from './dto/request/contract.query';
import { BaseResult } from 'src/common/dto/base.response';

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  // async findAll(query: ContractQueryDto): Promise<BaseResult<ContractResponse[]>> {
  //   const { page, limit, loanId, customerId } = query;
  //   const skip = (page - 1) * limit;

  //   const where: any = {};

  //   if (loanId) {
  //     where.loanId = loanId;
  //   }

  //   if (customerId) {
  //     where.customerId = customerId;
  //   }

  //   const [contracts, totalItems] = await Promise.all([
  //     this.prisma.contract.findMany({
  //       where,
  //       skip,
  //       take: limit,
  //       orderBy: {
  //         createdAt: 'desc',
  //       },
  //     }),
  //     this.prisma.contract.count({ where }),
  //   ]);

  //   const totalPages = Math.ceil(totalItems / limit);

  //   return {
  //     data: ContractMapper.toResponseList(contracts),
  //     meta: {
  //       totalItems,
  //       currentPage: page,
  //       totalPages,
  //       itemsPerPage: limit,
  //     },
  //   };
  // }

  // async findOne(id: string): Promise<ContractResponse> {
  //   const contract = await this.prisma.contract.findUnique({
  //     where: { id },
  //   });

  //   if (!contract) {
  //     throw new NotFoundException(`Contract with ID ${id} not found`);
  //   }

  //   return ContractMapper.toResponse(contract);
  // }
}
