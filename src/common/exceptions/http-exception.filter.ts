import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from 'generated/prisma';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorId = randomUUID(); // 🔑 trace error

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;

    /**
     * 1️⃣ HttpException
     */
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      message =
        typeof res === 'string' ? res : ((res as any).message ?? message);

      details = (res as any).errors ?? (res as any).details;
      code = HttpStatus[status] ?? 'HTTP_EXCEPTION';
    } else if (exception instanceof ZodError) {
      /**
       * 2️⃣ Zod
       */
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Validation failed';
      details = exception.flatten();
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      /**
       * 3️⃣ Prisma
       */
      status = HttpStatus.BAD_REQUEST;

      switch (exception.code) {
        case 'P2002':
          code = 'DUPLICATE_VALUE';
          message = 'Duplicate value';
          details = { fields: exception.meta?.target };
          break;

        case 'P2025':
          code = 'NOT_FOUND';
          message = 'Record not found';
          break;

        default:
          code = 'PRISMA_ERROR';
          message = exception.message;
      }
    } else if (exception instanceof Error) {
      /**
       * 4️⃣ Unknown / Runtime error (TypeError, ReferenceError...)
       */
      // ⚠️ Quan trọng: giữ message thật
      message = exception.message;

      this.logger.error(
        {
          errorId,
          method: request.method,
          url: request.url,
          body: request.body,
          query: request.query,
        },
        exception.stack,
      );
    } else {
      /**
       * 5️⃣ Non-error throw
       */
      this.logger.error(
        {
          errorId,
          method: request.method,
          url: request.url,
        },
        String(exception),
      );
    }

    response.status(status).json({
      success: false,
      error: {
        errorId, // 🔑 gửi cho client
        code,
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : message,
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
