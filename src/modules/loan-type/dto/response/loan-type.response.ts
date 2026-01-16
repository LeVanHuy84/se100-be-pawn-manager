import { ApiProperty } from '@nestjs/swagger';

export class LoanTypeResponse {
  @ApiProperty({ description: 'Unique identifier for the loan type' })
  id: string;
  @ApiProperty({ description: 'Name of the loan type' })
  name: string;
  @ApiProperty({ description: 'Description of the loan type', required: false })
  description?: string;
  @ApiProperty({ description: 'Duration of the loan type in months' })
  durationMonths: number;
  @ApiProperty({ description: 'Annual interest rate of the loan type' })
  interestRateMonthly: number;
  @ApiProperty({ description: 'Timestamp when the loan type was created' })
  createdAt: Date;
  @ApiProperty({ description: 'Timestamp when the loan type was last updated' })
  updatedAt: Date;
}
