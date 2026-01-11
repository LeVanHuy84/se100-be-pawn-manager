import { AuditLogResponseDto } from './dto/response/audit-log.dto';

export class AuditLogMapper {
  static toDto(auditLog: any): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = auditLog.id;
    dto.actorId = auditLog.actorId;
    dto.actorName = auditLog.actorName;
    dto.action = auditLog.action;
    dto.entityId = auditLog.entityId;
    dto.entityType = auditLog.entityType;
    dto.oldValue = auditLog.oldValue;
    dto.newValue = auditLog.newValue;
    dto.description = auditLog.description;
    dto.createdAt = auditLog.createdAt;
    return dto;
  }

  static toDtoList(auditLogs: any[]): AuditLogResponseDto[] {
    return auditLogs.map((log) => this.toDto(log));
  }
}
