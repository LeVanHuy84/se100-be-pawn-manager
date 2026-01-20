import { ApiProperty } from '@nestjs/swagger';

export class ConfigurationResponse {
  @ApiProperty({
    description: 'Unique parameter key identifier',
    example: 'LEGAL_INTEREST_CAP',
  })
  key: string;

  @ApiProperty({
    description: 'Current value stored as string (parse according to dataType)',
    example: '20.0',
  })
  value: string;

  @ApiProperty({
    description: 'Parameter group for categorization',
    example: 'RATES',
    enum: ['RATES', 'LIMITS', 'SYSTEM'],
    required: false,
  })
  group?: string | null;

  @ApiProperty({
    description: 'Human-readable description of the parameter purpose',
    example: 'Legal maximum annual interest rate in Vietnam (%)',
    required: false,
  })
  description?: string | null;

  @ApiProperty({
    description: 'Data type for value interpretation',
    example: 'DECIMAL',
    enum: ['STRING', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'JSON'],
  })
  dataType: string;
}
