import { Injectable } from '@nestjs/common';
import { BaseResult } from 'src/common/dto/base.response';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoanTypeResponse } from './dto/response/loan-type.response';
import { LoanTypeMapper } from './loan-type.mapper';
import { CreateLoanTypeDto } from './dto/request/create-loan-type.dto';
import { UpdateLoanTypeDto } from './dto/request/update-loan-type.dto';

@Injectable()
export class LoanTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(): Promise<BaseResult<LoanTypeResponse[]>> {
    const loanTypes = await this.prisma.loanType.findMany();
    return {
      data: LoanTypeMapper.toResponseDtoList(loanTypes),
    };
  }

  async create(body: CreateLoanTypeDto): Promise<BaseResult<LoanTypeResponse>> {
    // Validate
    const createdLoanType = await this.prisma.loanType.create({
      data: {
        name: body.name,
        description: body.description,
        durationMonths: body.durationMonths,
        interestRateMonthly: body.interestRateMonthly,
      },
    });
    return {
      data: LoanTypeMapper.toResponseDto(createdLoanType),
    };
  }

  async update(
    id: number,
    body: UpdateLoanTypeDto,
  ): Promise<BaseResult<LoanTypeResponse>> {
    const data = Object.fromEntries(
      Object.entries(body).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    const updatedLoanType = await this.prisma.loanType.update({
      where: { id },
      data,
    });

    return {
      data: LoanTypeMapper.toResponseDto(updatedLoanType),
    };
  }
}
