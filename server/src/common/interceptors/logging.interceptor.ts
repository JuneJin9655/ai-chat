import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const { ip, method, originalUrl } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const response = ctx.getResponse<Response>();
                    const { statusCode } = response;
                    const contentLength = response.get('content-length') || 0;
                    const responseTime = Date.now() - startTime;

                    this.logger.log(
                        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms - ${ip} ${userAgent}`,
                    );
                },
                error: (error) => {
                    const response = ctx.getResponse<Response>();
                    const statusCode = error.status || 500;
                    const responseTime = Date.now() - startTime;

                    this.logger.error(
                        `${method} ${originalUrl} ${statusCode} - ${responseTime}ms - ${ip} ${userAgent} - ${error.message}`,
                        error.stack,
                    );
                },
            }),
        );
    }
}