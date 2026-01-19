import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      response.status(status).json({
        error: {
          code: HttpStatus[status],
          message:
          typeof res === 'string' ? res : (res as any).message ?? 'Error',
        },
});
      return;
    }

    console.error('Unhandled exception:', exception);

    response.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
      },
    });
  }
}
