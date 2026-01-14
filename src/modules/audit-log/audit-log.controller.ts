import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  AuditLogQueryDto,
  AuditLogQuerySchema,
} from './dto/request/audit-log.query';
import {
  ApiOperation,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { BaseResult } from 'src/common/dto/base.response';
import { LoanResponseDto } from '../loan/dto/response/loan.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';
import { AuditLogResponseDto } from './dto/response/audit-log.dto';

@Controller({
  version: '1',
  path: 'audit-logs',
})
@ApiExtraModels(BaseResult, AuditLogResponseDto, PaginationMeta)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve audit logs with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Audit log list retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResult) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(AuditLogResponseDto) },
            },
            meta: { $ref: getSchemaPath(PaginationMeta) },
          },
        },
      ],
    },
  })
  getAuditLogs(
    @Query(new ZodValidationPipe(AuditLogQuerySchema)) query: AuditLogQueryDto,
  ): Promise<BaseResult<AuditLogResponseDto[]>> {
    return this.auditLogService.getAuditLogs(query);
  }
}
