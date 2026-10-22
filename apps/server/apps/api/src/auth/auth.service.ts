import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService as AuthLibService } from '@libs/auth';
import type { AppConfig } from '@libs/config';
import { ResponseService } from '@libs/common';
import { MailService } from '@libs/mail';
import { RedisService } from '@libs/redis';
import type { AuthUser, LoginResponse, RefreshResponse } from '@ragflux/shared/auth';
import { AuthRepository, type UserRow } from './auth.repository.js';
import type { LoginDto } from './dto/login.dto.js';
import type { SendCodeDto } from './dto/send-code.dto.js';
import { clearRefreshTokenCookie, readRefreshToken, setRefreshTokenCookie } from './helper/refresh-token.cookie.js';

/** 验证码 TTL */
const CODE_TTL_SECONDS = 5 * 60;
/** 验证码冷却期 */
const RESEND_COOLDOWN_SECONDS = 60;
/** 验证码失败次数上限 */
const CODE_ATTEMPTS_LIMIT = 5;
/** 发送验证码次数上限 */
const SEND_CODE_HOURLY_LIMIT = 10;
/** 发送验证码次数上线时间窗口 */
const SEND_CODE_HOURLY_WINDOW_SECONDS = 60 * 60;
/** 刷新 token 最大年龄 */
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const RedisKeys = {
  /** 验证码 */
  code: (email: string) => `auth:code:${email}`,
  /** 验证码冷却期 */
  cooldown: (email: string) => `auth:code:cooldown:${email}`,
  /** 验证码失败次数 */
  attempts: (email: string) => `auth:code:attempts:${email}`,
  /** 发送验证码次数 */
  sendCodeRate: (email: string) => `auth:code:rate:${email}`,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authLibService: AuthLibService,
    private readonly responseService: ResponseService,
    private readonly mailService: MailService,
    private readonly authRepository: AuthRepository,
    private readonly redis: RedisService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /**
   * 发送验证码
   * @param email 登录邮箱
   * @returns 发送结果响应
   * 1. 限流处理
   * 2. 检查是否在冷却期
   * 3. 生成验证码并进入冷却期
   */
  async sendVerificationCode({ email }: SendCodeDto) {
    // 检查是否在发送验证码次数上限
    const rate = await this.redis.client.incr(RedisKeys.sendCodeRate(email));
    if (rate === 1) {
      await this.redis.client.expire(RedisKeys.sendCodeRate(email), SEND_CODE_HOURLY_WINDOW_SECONDS);
    }
    if (rate >= SEND_CODE_HOURLY_LIMIT) {
      await this.redis.client.del(RedisKeys.sendCodeRate(email));
      this.logger.warn(`发送验证码被限流: ${email}`);
      return this.responseService.error('发送过于频繁，请稍后再试');
    }

    // 检查是否在冷却期
    if (await this.redis.client.exists(RedisKeys.cooldown(email))) {
      this.logger.warn(`发送验证码处于冷却期: ${email}`);
      return this.responseService.error('验证码已发送，请稍后再试');
    }

    // 生成验证码
    const code = String(randomInt(100000, 1000000));
    // 先写 Redis，发邮件失败时回滚，避免用户收到无效验证码
    await this.redis.client.set(RedisKeys.code(email), code, 'EX', CODE_TTL_SECONDS);

    try {
      await this.mailService.sendVerificationCode(email, code);
    } catch (error) {
      await this.redis.client.del(RedisKeys.code(email));
      this.logger.error(`验证码发送失败: ${email}`, error instanceof Error ? error.stack : String(error));
      return this.responseService.error('验证码发送失败，请稍后再试');
    }

    // 发送成功后才设置冷却期
    await this.redis.client.set(RedisKeys.cooldown(email), '1', 'EX', RESEND_COOLDOWN_SECONDS);
    this.logger.log(`验证码已发送: ${email}`);

    return this.responseService.success<null>(null, '验证码已发送');
  }

  /**
   * 注册 && 登录
   * @param email 登录邮箱
   * @param code 邮箱验证码
   * @param res HTTP 响应对象
   * @returns 登录用户和令牌响应
   * 1. 验证验证码
   * 2. 如果超过失败次数上限，作废验证码
   * 3. 如果验证码正确，生成 token 并设置 refresh token cookie
   * 4. 返回用户信息
   */
  async login({ email, code }: LoginDto, res: Response) {
    // 验证验证码
    const stored = await this.redis.client.get(RedisKeys.code(email));
    if (!stored) {
      this.logger.warn(`登录失败，验证码不存在或已过期: ${email}`);
      return this.responseService.error('验证码不存在或已过期');
    }

    if (timingSafeEqual(Buffer.from(stored), Buffer.from(code))) {
      // 校验通过：消费验证码，并清空失败计数
      await this.redis.client.del(RedisKeys.code(email));
      await this.redis.client.del(RedisKeys.attempts(email));
    } else {
      // 校验失败：累加失败次数，超过上限作废验证码
      const attempts = await this.redis.client.incr(RedisKeys.attempts(email));
      if (attempts === 1) {
        await this.redis.client.expire(RedisKeys.attempts(email), CODE_TTL_SECONDS);
      }
      if (attempts >= CODE_ATTEMPTS_LIMIT) {
        await this.redis.client.del(RedisKeys.code(email));
        await this.redis.client.del(RedisKeys.attempts(email));
        this.logger.warn(`登录失败，验证码错误次数超限，已作废: ${email}`);
      } else {
        this.logger.warn(`登录失败，验证码不正确: ${email}, attempts=${attempts}`);
      }
      return this.responseService.error('验证码不正确');
    }

    const user = await this.authRepository.findOrCreateByEmail(email, nicknameFromEmail(email));

    setRefreshTokenCookie(res, this.authLibService.generateToken(user.id, 'refresh'), {
      secure: this.configService.get('isProduction', { infer: true }),
      maxAge: REFRESH_MAX_AGE_MS,
    });
    const data: LoginResponse = {
      user: toUserView(user),
      accessToken: this.authLibService.generateToken(user.id, 'access'),
    };
    this.logger.log(`登录成功: userId=${user.id}, email=${email}`);
    return this.responseService.success<LoginResponse>(data);
  }

  /**
   * 用 Cookie 中的刷新令牌换取新的访问令牌，并轮换刷新令牌。
   * @param req HTTP 请求对象
   * @param res HTTP 响应对象
   * @returns 新的访问令牌。用户信息由 GET /auth/me 单独返回
   */
  async refresh(req: Request, res: Response) {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken) {
      this.logger.warn('刷新令牌失败: 缺少 refresh token');
      return this.responseService.error('未登录');
    }

    const payload = this.authLibService.verifyToken(refreshToken, 'refresh');
    if (!payload) {
      clearRefreshTokenCookie(res, {
        secure: this.configService.get('isProduction', { infer: true }),
        maxAge: REFRESH_MAX_AGE_MS,
      });
      this.logger.warn('刷新令牌失败: token 无效或已过期');
      return this.responseService.error('登录已过期');
    }

    const user = await this.authRepository.findById(payload.userId);
    if (!user) {
      clearRefreshTokenCookie(res, {
        secure: this.configService.get('isProduction', { infer: true }),
        maxAge: REFRESH_MAX_AGE_MS,
      });
      this.logger.warn(`刷新令牌失败，用户不存在: userId=${payload.userId}`);
      return this.responseService.error('账号不可用');
    }

    setRefreshTokenCookie(res, this.authLibService.generateToken(user.id, 'refresh'), {
      secure: this.configService.get('isProduction', { infer: true }),
      maxAge: REFRESH_MAX_AGE_MS,
    });
    const data: RefreshResponse = {
      accessToken: this.authLibService.generateToken(user.id, 'access'),
    };
    this.logger.log(`刷新令牌成功: userId=${user.id}`);
    return this.responseService.success<RefreshResponse>(data);
  }

  /** 清掉 HttpOnly 刷新令牌。访问令牌由前端自行丢弃。
   * @param res HTTP 响应对象
   * @returns 登出结果响应
   */
  logout(res: Response) {
    clearRefreshTokenCookie(res, {
      secure: this.configService.get('isProduction', { infer: true }),
      maxAge: REFRESH_MAX_AGE_MS,
    });
    this.logger.log('已登出');
    return this.responseService.success<null>(null);
  }

  /**
   * 获取用户信息
   * @param userId 当前用户编号
   * @returns 用户信息响应
   * 1. 检查用户并返回用户信息
   */
  async me(userId: number) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      this.logger.warn(`获取用户信息失败: userId=${userId}`);
      return this.responseService.error('未登录');
    }
    return this.responseService.success<AuthUser>(toUserView(user));
  }
}

function nicknameFromEmail(email: string): string {
  const name = email.slice(0, email.indexOf('@'));
  return name.slice(0, 10) || '用户';
}

function toUserView(user: UserRow): AuthUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
  };
}
