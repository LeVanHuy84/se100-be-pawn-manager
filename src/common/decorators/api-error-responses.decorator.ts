import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorWrapperDto } from '../dto/error.response';

export function ApiErrorResponses() {
  return applyDecorators(
    ApiResponse({
      description: 'Error response (handled by global exception filter)',
      type: ErrorWrapperDto,
      example: {
        success: false,
        error: {
          errorId: '550e8400-e29b-41d4-a716-446655440000',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [{}],
          timestamp: '2024-01-10T10:00:00.000Z',
        },
      },
    }),
  );
}
