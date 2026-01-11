import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Unique error identifier for tracing',
    example: 'a687ea76-c56c-400a-bf43-95520d61d2dc',
  })
  errorId: string;

  @ApiProperty({
    description: 'Error code',
    example: 'BAD_REQUEST',
  })
  code: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Additional error details (free-form JSON)',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
    },
    example: [
      {
        expected: 'string',
        code: 'invalid_type',
        path: ['customerId'],
        message: 'Invalid input: expected string, received undefined',
      },
    ],
  })
  details?: Record<string, any>[];

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2026-01-10T11:39:13.734Z',
  })
  timestamp: string;
}

export class ErrorWrapperDto {
  @ApiProperty({
    description: 'Request success status',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Error details',
    type: ErrorResponseDto,
  })
  error: ErrorResponseDto;
}
