import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from 'src/common/dto/pagination.type';

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty()
  actorName: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityName: string;

  @ApiProperty({ type: Object })
  oldValue: Record<string, any>;

  @ApiProperty({ type: Object })
  newValue: Record<string, any>;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
