import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { AuthUser, AuthTokenPayload } from './auth.service';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const Headers = req.headers;
    const authorization = Headers.authorization;

    if (!authorization) {
      this.logger.warn(`鉴权失败: 缺少 Authorization header`);
      throw new UnauthorizedException('未授权!!!');
    }
    const token = authorization.replace('Bearer ', '');

    try {
      const payload: AuthTokenPayload | null = this.authService.verifyToken(token);

      if (!payload) {
        this.logger.warn(`鉴权失败: token 验证失败`);
        throw new UnauthorizedException('token 过期或无效!!!');
      }

      // 验证 token 的类型，确保它是一个访问令牌
      if (payload.tokenType !== 'access') {
        this.logger.warn(`鉴权失败: token 类型不正确`);
        throw new UnauthorizedException('token 过期或无效!!!');
      }

      // 将用户信息保存在请求中
      req.user = {
        userId: payload.userId,
      };
      return true;
    } catch {
      this.logger.warn(`鉴权失败: token 验证失败`);
      throw new UnauthorizedException('token 过期或无效!!!');
    }
  }
}
