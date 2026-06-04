import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { Request, Response } from 'express';

/**
 * Catch-all exception filter.
 *
 * - `HttpException`s are passed through with their original status and body so
 *   the response shape the clients already rely on is preserved.
 * - Any other (unhandled) error is logged with its stack and returned as a
 *   generic 500 so internal details never leak to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(exception.getResponse());
      return;
    }

    this.logger.error(
      {
        err: exception,
        path: request?.url,
        method: request?.method,
      },
      'Unhandled exception',
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}
