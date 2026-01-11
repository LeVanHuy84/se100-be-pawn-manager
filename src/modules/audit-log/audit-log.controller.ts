import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  AuditLogQueryDto,
  AuditLogQuerySchema,
} from './dto/request/audit-log.query';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ListAuditLogResponseDto } from './dto/response/audit-log.dto';

@Controller({
  version: '1',
  path: 'audit-logs',
})
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve audit logs with optional filters' })
  @ApiOkResponse({
    description: 'List of loans retrieved successfully',
    type: ListAuditLogResponseDto,
  })
  getAuditLogs(
    @Query(new ZodValidationPipe(AuditLogQuerySchema)) query: AuditLogQueryDto,
  ) {
    return this.auditLogService.getAuditLogs(query);
  }
}
