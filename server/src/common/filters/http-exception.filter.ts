import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal Server Error';

    const details =
      exception instanceof HttpException
        ? (exception.getResponse() as { message?: string | string[] })
        : { message: 'Unknown error' };

    const formattedDetails =
      typeof details === 'string'
        ? details
        : Array.isArray(details.message)
          ? details.message.join(', ')
          : details.message || 'Unknown error';

    const errorResponse = {
      success: false,
      error: {
        code: status,
        message: message,
        details: formattedDetails,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: uuidv4(),
    };

    response.status(status).json(errorResponse);
  }
}
