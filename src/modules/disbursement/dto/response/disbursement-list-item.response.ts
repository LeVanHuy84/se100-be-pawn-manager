import { DisbursementMethod } from 'generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DisbursementListItem {
  @ApiProperty({
    description: 'Disbursement ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Loan ID (Optional for external expenses)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  loanId?: string | null;

  @ApiPropertyOptional({
    description: 'Loan code for reference (Optional)',
    example: 'LOAN-2026-000123',
    nullable: true,
  })
  loanCode?: string | null;

  @ApiProperty({
    description: 'Disbursement amount in VND',
    example: 10000000,
  })
  amount: number;

  @ApiProperty({
    description: 'Disbursement method',
    enum: DisbursementMethod,
    example: 'CASH',
  })
  disbursementMethod: DisbursementMethod;

  @ApiProperty({
    description: 'Disbursement timestamp (ISO 8601)',
    example: '2026-01-10T08:30:00.000Z',
  })
  disbursedAt: string;

  @ApiProperty({
    description: 'Reference code',
    example: 'DSB-2026-000001',
    nullable: true,
  })
  referenceCode: string | null;

  @ApiProperty({
    description: 'Recipient name',
    example: 'Nguyễn Văn A',
  })
  recipientName: string;

  @ApiPropertyOptional({
    description: 'Employee ID who performed disbursement',
    example: 'user_2abc123def456',
    nullable: true,
  })
  disbursedBy?: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Disbursement for loan approval',
    nullable: true,
  })
  notes?: string | null;

  @ApiProperty({
    description: 'Created timestamp (ISO 8601)',
    example: '2026-01-10T08:30:00.000Z',
  })
  createdAt: string;
}
