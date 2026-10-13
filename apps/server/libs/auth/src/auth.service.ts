import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@libs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

export type TokenType = 'access' | 'refresh';
export type AuthUser = { userId: number };
export type AuthTokenPayload = AuthUser & { tokenType: TokenType };

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /**
   * 对密码进行哈希处理
   * @param password 密码
   * @returns 哈希后的密码
   */
  hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  /**
   * 验证密码是否匹配
   * @param hash 哈希后的密码
   * @param password 明文密码
   * @returns 是否匹配
   */
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * 生成token
   * @param userId 用户ID
   * @param tokenType 令牌类型
   * @returns token
   */
  generateToken(userId: number, tokenType: AuthTokenPayload['tokenType']): string {
    const expiresIn = this.configService.get('auth.expiresIn', { infer: true })[tokenType];
    return this.jwtService.sign({ userId, tokenType } satisfies AuthTokenPayload, { expiresIn });
  }

  /**
   * 验证token
   * @param token token
   * @param tokenType 令牌类型
   * @returns 令牌有效载荷 | null
   */
  verifyToken(token: string, tokenType?: AuthTokenPayload['tokenType']): AuthTokenPayload | null {
    try {
      const payload = this.jwtService.verify<AuthTokenPayload>(token);
      if (tokenType !== undefined && payload.tokenType !== tokenType) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}
