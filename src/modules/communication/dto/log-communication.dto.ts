import z from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from 'generated/prisma';

export const logCommunicationSchema = z.object({
  loanId: z.uuid('loanId must be a valid UUID'),
  type: z.enum(NotificationType),
  channel: z.enum(['SMS', 'EMAIL', 'PHONE_CALL', 'IN_PERSON'] as const),
  status: z.enum(NotificationStatus),
  subject: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  callDuration: z.number().int().positive().optional(),
  promiseToPayDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export class LogCommunicationDto extends createZodDto(logCommunicationSchema) {
  @ApiProperty({
    description: 'Loan ID being communicated about',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  loanId: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: 'OVERDUE_REMINDER',
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Communication channel used',
    enum: NotificationChannel,
    example: 'PHONE_CALL',
  })
  channel: NotificationChannel;

  @ApiProperty({
    description: 'Result status of the communication',
    enum: NotificationStatus,
    example: 'PROMISE_TO_PAY',
  })
  status: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Subject or purpose of communication',
    example: 'Nhắc nợ quá hạn kỳ 1',
    maxLength: 200,
  })
  subject?: string;

  @ApiPropertyOptional({
    description: 'Message content or call notes',
    example: 'Khách hẹn trả vào thứ Hai tuần sau',
    maxLength: 1000,
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Call duration in seconds (for PHONE_CALL)',
    example: 180,
    minimum: 1,
  })
  callDuration?: number;

  @ApiPropertyOptional({
    description: 'Date customer promised to pay (if applicable)',
    example: '2026-01-20',
    format: 'date',
  })
  promiseToPayDate?: string;
}
