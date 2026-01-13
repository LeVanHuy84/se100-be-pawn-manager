import z from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DisbursementMethod } from 'generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const disbursementRequestSchema = z.object({
  loanId: z.uuid('loanId must be a valid UUID'),
  amount: z.number().positive('Amount must be greater than 0'),
  disbursementMethod: z.enum(DisbursementMethod),
  disbursedBy: z.string().optional(),
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientIdNumber: z.string().optional(),
  witnessName: z.string().optional(),
  notes: z.string().max(500).optional(),
  bankTransferRef: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
});

export class DisbursementRequestDto extends createZodDto(
  disbursementRequestSchema,
) {
  @ApiProperty({
    description: 'Loan ID for disbursement',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  loanId: string;

  @ApiProperty({
    description: 'Disbursement amount in VND',
    example: 10000000,
    minimum: 1,
  })
  amount: number;

  @ApiProperty({
    description: 'Disbursement method',
    enum: DisbursementMethod,
    example: 'CASH',
  })
  disbursementMethod: DisbursementMethod;

  @ApiPropertyOptional({
    description: 'Employee ID who performed disbursement (Clerk user ID)',
    example: 'user_2abc123def456',
  })
  disbursedBy?: string;

  @ApiProperty({
    description: 'Recipient name',
    example: 'Nguyễn Văn A',
  })
  recipientName: string;

  @ApiPropertyOptional({
    description: 'Recipient ID number (CMND/CCCD)',
    example: '079123456789',
  })
  recipientIdNumber?: string;

  @ApiPropertyOptional({
    description: 'Witness name for cash disbursement',
    example: 'Trần Thị B',
  })
  witnessName?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Disbursement for loan approval',
    maxLength: 500,
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Bank transfer reference number',
    example: 'FT123456789',
  })
  bankTransferRef?: string;

  @ApiPropertyOptional({
    description: 'Recipient bank account number',
    example: '0123456789',
  })
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'Vietcombank',
  })
  bankName?: string;
}
