import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from 'generated/prisma';

export class NotificationLogResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty()
  loanId: string;

  @ApiProperty()
  customerId: string;

  @ApiPropertyOptional()
  customerName?: string;

  @ApiPropertyOptional()
  customerPhone?: string;

  @ApiPropertyOptional()
  subject?: string | null;

  @ApiPropertyOptional()
  message?: string | null;

  @ApiPropertyOptional()
  recipientContact?: string | null;

  @ApiPropertyOptional()
  callDuration?: number | null;

  @ApiPropertyOptional()
  employeeId?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  promiseToPayDate?: string | null;

  @ApiPropertyOptional()
  sentAt?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
