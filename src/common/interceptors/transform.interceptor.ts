import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  PaginationResult,
  ResponseMeta,
} from '../interfaces/response.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    return next
      .handle()
      .pipe(map((data) => this.buildResponse(data, request, response)));
  }

  private buildResponse<T>(
    data: T,
    request: Request,
    response: Response,
  ): ApiResponse<T> {
    const meta: ResponseMeta = {
      statusCode: response.statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) || randomUUID(),
    };

    if (this.isPaginate(data)) {
      const { items, page, limit, total } = data;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: items as T,
        meta: {
          ...meta,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
    }

    return { success: true, data, meta };
  }

  private isPaginate(data: unknown): data is PaginationResult<unknown> {
    return (
      typeof data === 'object' &&
      data !== null &&
      'items' in data &&
      'page' in data &&
      'limit' in data &&
      'total' in data
    );
  }
}
