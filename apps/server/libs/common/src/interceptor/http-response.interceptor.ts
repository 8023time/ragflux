import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import type { HttpResponse } from '../response/response.service.ts';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class HttpResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: HttpResponse<unknown> | undefined) => {
        // 问答接口已经把响应写成 SSE，这里不能再包一层 JSON。
        if (response.headersSent || !isHttpResponse(data)) {
          return data;
        }
        return {
          msg: data.msg,
          code: data.code,
          data: transformBigInt(data.data) ?? null,
        };
      }),
    );
  }
}

function isHttpResponse(data: unknown): data is HttpResponse<unknown> {
  return data != null && typeof data === 'object' && 'code' in data && 'msg' in data;
}

/**
 * 处理 BIGINT 类型的数据
 * 为什么要处理 BIGINT 类型的数据？
 * 在 JavaScript 中，Number 类型的最大安全整数是 2^53 - 1（即 9007199254740991）。当数据库中的 BIGINT 类型的值超过这个范围时，JavaScript 无法准确表示它们，可能会导致精度丢失。
 * 为了避免这种情况，我们将 BIGINT 类型的数据转换为字符串，以确保数据的准确性。
 * @param value 需要处理的数据
 * @returns 处理后的数据
 */
function transformBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(transformBigInt);
  }
  if (value !== null && typeof value === 'object') {
    if (value instanceof Date) {
      return value;
    }
    const newObj: Record<string, unknown> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        newObj[key] = transformBigInt((value as Record<string, unknown>)[key]);
      }
    }
    return newObj;
  }
  return value;
}
