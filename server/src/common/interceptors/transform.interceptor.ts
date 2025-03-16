import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    timestamp: string;
    path: string;
    requestId: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map(data => {
                const request = context.switchToHttp().getRequest();
                return {
                    success: true,
                    data,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    requestId: uuidv4(),
                };
            }),
        );
    }
}