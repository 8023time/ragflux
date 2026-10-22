import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiResponse } from '@ragflux/shared/common';

interface HttpExceptionResponse extends ApiResponse<undefined> {
  details?: unknown;
}

/**
 * 处理 HTTP 异常并返回统一的错误响应。
 *
 * 处理规则：
 * - 提取 HttpException 的 HTTP 状态码作为 code。
 * - 优先使用异常响应中的 message 作为 msg。
 * - ValidationPipe 产生的 message 数组统一转换为「参数校验失败」，
 *   原始校验信息放入 details。
 * - 普通异常不返回 details 字段，避免返回无意义的 null。
 * - HTTP 5xx 异常记录 error 日志及异常堆栈。
 * - HTTP 4xx 异常记录 warn 日志。
 *
 * 返回结构：
 * {
 *   code: number;
 *   msg: string;
 *   details?: unknown;
 * }
 *
 * @param exception HTTP 异常实例
 * @param host NestJS HTTP 请求上下文
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let msg = exception.message;
    let details: unknown;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const message = (exceptionResponse as { message?: unknown }).message;

      // 处理 ValidationPipe 产生的 message 数组
      if (Array.isArray(message)) {
        msg = '参数校验失败';
        details = message.map(String);
      } else if (typeof message === 'string') {
        msg = message;
      }
    } else if (typeof exceptionResponse === 'string') {
      msg = exceptionResponse;
    }

    const logFormat = `[${request.method}] ${request.url} ${status} ${msg}`;

    if (status >= 500) {
      this.logger.error(logFormat, exception.stack);
    } else {
      this.logger.warn(logFormat);
    }

    // 返回统一的异常响应结构
    const result: HttpExceptionResponse = {
      code: status,
      msg,
      ...(details ? { details } : {}),
    };

    return response.status(status).json(result);
  }
}
