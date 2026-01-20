import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogQueryDto } from './dto/request/audit-log.query';
import { AuditLogResponseDto } from './dto/response/audit-log.dto';
import { AuditLogMapper } from './audit-log.mapper';
import { BaseResult } from 'src/common/dto/base.response';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(
    dto: AuditLogQueryDto,
  ): Promise<BaseResult<AuditLogResponseDto[]>> {
    const { actorId, action, startDate, endDate, page, limit } = dto;

    const whereClause: any = {};
    if (actorId) {
      whereClause.actorId = actorId;
    }
    if (action) {
      whereClause.action = action;
    }
    if (startDate) {
      whereClause.createdAt = { gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: new Date(endDate),
      };
    }
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      data: AuditLogMapper.toDtoList(logs),
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }
}
