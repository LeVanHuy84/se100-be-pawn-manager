import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse: any = exception.getResponse();

      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else {
        message = errorResponse.message || 'Error';
        if (typeof errorResponse === 'object' && errorResponse !== null) {
          if (errorResponse.errors) {
            details = errorResponse.errors;
          }
        }
      }
    }

    response.status(status).json({
      error: {
        statusCode: status,
        timestamp: new Date().toISOString(),
        message: message,
        details: details,
      },
    });
  }
}
