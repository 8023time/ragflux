# Auth

服务端共享认证库，提供密码哈希、JWT 签发与校验，以及基于访问令牌的接口守卫。登录、注册等业务接口由各应用自己实现，本库只负责认证原语。

通过 `@libs/auth` 引入。

## 能力

| 导出                                                                                                                       | 作用                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `AuthModule`                                                                                                               | 注册 JWT，并导出 `AuthService` 与 `AuthGuard`                            |
| `AuthService`                                                                                                              | 密码哈希 / 校验，签发与验证 access、refresh 令牌                         |
| `AuthGuard`                                                                                                                | 校验 `Authorization: Bearer <access token>`，通过后把载荷挂到 `req.user` |
| `AuthUser`                                                                                                                 | 用户信息：`userId`                                                       |
| `AuthTokenPayload`                                                                                                         | 令牌载荷：`userId`、`tokenType`                                          |
| `TokenType`                                                                                                                | 令牌类型：`access`、`refresh`                                            |
| 密码使用 [argon2](https://github.com/ranisalt/node-argon2) 哈希。令牌使用 `@nestjs/jwt`，密钥与有效期来自 `@libs/config`。 |

## 使用

在应用模块中导入：

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';

@Module({
  imports: [AuthModule],
})
export class AppModule {}
```

签发与校验：

```ts
const hash = await this.authService.hashPassword(password);
const matched = await this.authService.verifyPassword(hash, password);

const accessToken = this.authService.generateToken(userId, 'access');
const refreshToken = this.authService.generateToken(userId, 'refresh');

const payload = this.authService.verifyToken(accessToken, 'access');
```

`verifyToken` 在签名无效、已过期，或传入的 `tokenType` 与载荷不一致时返回 `null`。不传 `tokenType` 时只校验签名与有效期。

保护路由：

```ts
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@libs/auth';

@UseGuards(AuthGuard)
@Get('me')
me(@Req() req: Request) {
  return req.user; // { userId: number }
}
```

守卫只接受 `tokenType` 为 `access` 的令牌。缺少 `Authorization` 头、令牌无效或类型不是 `access` 时，抛出 `401 Unauthorized`。`Request.user` 的类型在 `apps/server/type/express.d.ts` 中扩展为 `AuthUser`。
