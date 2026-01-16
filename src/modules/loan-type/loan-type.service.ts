import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseResult } from 'src/common/dto/base.response';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoanTypeResponse } from './dto/response/loan-type.response';
import { LoanTypeMapper } from './loan-type.mapper';
import { CreateLoanTypeDto } from './dto/request/create-loan-type.dto';
import { UpdateLoanTypeDto } from './dto/request/update-loan-type.dto';
import { AuditEntityType } from 'generated/prisma';

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
    const createdLoanType = await this.prisma.$transaction(async (tx) => {
      const loanType = await tx.loanType.create({
        data: {
          name: body.name,
          description: body.description,
          durationMonths: body.durationMonths,
          interestRateMonthly: body.interestRateMonthly,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'LOAN_TYPE',
          entityId: loanType.id.toString(),
          entityType: AuditEntityType.LOAN_TYPE,
          entityName: loanType.name,
          newValue: {
            durationMonths: loanType.durationMonths,
            interestRateMonthly: loanType.interestRateMonthly,
          },
          actorId: null,
          description: `Tạo loại khoản vay với ID ${loanType.id}`,
        },
      });

      return loanType;
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

    const updatedLoanType = await this.prisma.$transaction(async (tx) => {
      const oldLoanType = await tx.loanType.findUnique({
        where: { id },
      });

      if (!oldLoanType) {
        throw new NotFoundException(`LoanType ${id} not found`);
      }

      const loanType = await tx.loanType.update({
        where: { id },
        data,
      });

      // chỉ log những field thực sự thay đổi
      const oldValue = Object.fromEntries(
        Object.keys(data).map((key) => [key, oldLoanType[key]]),
      );

      await tx.auditLog.create({
        data: {
          action: 'LOAN_TYPE',
          entityId: loanType.id.toString(),
          entityType: AuditEntityType.LOAN_TYPE,
          entityName: loanType.name,
          oldValue,
          newValue: data,
          actorId: null,
          description: `Cập nhật loại khoản vay với ID ${loanType.id}`,
        },
      });

      return loanType;
    });

    return {
      data: LoanTypeMapper.toResponseDto(updatedLoanType),
    };
  }
}
