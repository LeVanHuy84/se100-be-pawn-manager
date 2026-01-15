import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, body, query } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log the incoming request
    this.logger.log(`Incoming Request: ${method} ${originalUrl}`);
    if (method !== 'GET' && Object.keys(body).length > 0) {
      this.logger.log(`Body: ${JSON.stringify(body, null, 2)}`);
    }
    if (Object.keys(query).length > 0) {
      this.logger.log(`Query: ${JSON.stringify(query, null, 2)}`);
    }

    response.on('finish', () => {
      const { statusCode } = response;
      const duration = Date.now() - startTime;

      const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

      if (statusCode >= 400) {
        this.logger.error(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
