import { RepaymentMethod } from 'generated/prisma';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const loanSimulationRequestSchema = z.object({
  loanAmount: z.number().int().positive('amount must be > 0'),
  totalFeeRate: z.number().nonnegative('totalFeeRate must be >= 0'),
  loanTypeId: z.number().int('loanTypeId must be an integer'),
  repaymentMethod: z.enum(RepaymentMethod),
});

export class LoanSimulationRequestDto extends createZodDto(
  loanSimulationRequestSchema,
) {
  @ApiProperty({
    description: 'Loan amount requested in VND',
    example: 50000000,
    minimum: 1,
  })
  loanAmount: number;

  @ApiProperty({
    description:
      'Total fee rate per month (%). Sum of management fee + all collateral custody fees.',
    example: 0.52,
    minimum: 0,
  })
  totalFeeRate: number;

  @ApiProperty({
    description:
      'ID of the loan product type (determines duration & interest rate)',
    example: 1,
  })
  loanTypeId: number;

  @ApiProperty({
    description: 'Repayment method',
    enum: RepaymentMethod,
    example: 'EQUAL_INSTALLMENT',
    enumName: 'RepaymentMethod',
  })
  repaymentMethod: RepaymentMethod;
}
