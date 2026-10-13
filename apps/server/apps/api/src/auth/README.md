# 认证模块

通过邮箱验证码完成登录或注册，并使用访问令牌和 HttpOnly 刷新令牌维持登录状态。

接口统一挂载在 `/api/v1/auth` 下。请求体由全局 `ValidationPipe` 校验，邮箱会去掉首尾空白并转换为小写。成功响应的 `code` 为 `0`，业务失败响应的 `code` 为 `1`；参数校验失败由全局异常过滤器返回 HTTP `400`。

## 接口

| 方法   | 路径                     | 鉴权                            | 作用                       |
| ------ | ------------------------ | ------------------------------- | -------------------------- |
| `POST` | `/api/v1/auth/send-code` | 无                              | 向邮箱发送 6 位验证码      |
| `POST` | `/api/v1/auth/login`     | 无                              | 校验验证码并登录或注册     |
| `POST` | `/api/v1/auth/refresh`   | Cookie 中的刷新令牌             | 换发访问令牌并轮换刷新令牌 |
| `GET`  | `/api/v1/auth/me`        | `Authorization: Bearer <token>` | 返回当前登录用户           |
| `POST` | `/api/v1/auth/logout`    | 无                              | 清除 Cookie 中的刷新令牌   |

### 发送验证码：`POST /api/v1/auth/send-code`

请求体：

```json
{
  "email": "user@example.com"
}
```

验证码为 6 位数字，写入 Redis 后 5 分钟过期，并通过 `@libs/mail` 发送邮件。

成功返回：

- `data` 为 `null`。
- `msg` 为「验证码已发送」。

失败情况：

- 邮箱格式不正确：参数校验返回「请输入正确的邮箱」。
- 同一邮箱处于 60 秒冷却期：「验证码已发送，请稍后再试」。
- 同一邮箱一小时内发送次数达到 10 次：「发送过于频繁，请稍后再试」。
- 邮件发送失败：「验证码发送失败，请稍后再试」，同时删除已写入的验证码。

### 登录：`POST /api/v1/auth/login`

请求体：

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

验证码校验通过后会消费验证码，并按邮箱查找用户；用户不存在时自动创建。新用户昵称取邮箱 `@` 前的内容，最多 10 个字符，内容为空时使用「用户」。

成功返回：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "user"
    },
    "accessToken": "<access token>"
  }
}
```

同时写入 `refreshToken` Cookie。该 Cookie 为 `HttpOnly`、`SameSite=Lax`、`Path=/`，有效期 7 天；生产环境额外设置 `Secure`。访问令牌有效期为 15 分钟，令牌类型约定见 [`libs/auth`](../../../../libs/auth/README.md)。

失败情况：

- 验证码不是 6 位数字：参数校验返回「请输入 6 位验证码」或「请输入 6 位数字验证码」。
- 验证码不存在或已过期：「验证码不存在或已过期」。
- 验证码不正确：「验证码不正确」。同一验证码累计错误 5 次后作废。

### 刷新令牌：`POST /api/v1/auth/refresh`

不需要请求体。从 `refreshToken` Cookie 中读取刷新令牌，并校验令牌类型必须为 `refresh`。

成功后签发新的访问令牌和刷新令牌，旧 Cookie 会被覆盖；返回结构与登录接口一致。

失败情况：

- 缺少刷新令牌：「未登录」。
- 刷新令牌无效或已过期：清除 Cookie，并返回「登录已过期」。
- 刷新令牌对应的用户不存在：清除 Cookie，并返回「账号不可用」。

### 获取当前用户：`GET /api/v1/auth/me`

请求头：

```http
Authorization: Bearer <access token>
```

守卫只接受类型为 `access` 的访问令牌。令牌缺失或无效时返回 HTTP `401`。

成功时 `data` 为当前用户信息：

```json
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "user"
}
```

用户不存在时返回「未登录」。

### 登出：`POST /api/v1/auth/logout`

不需要请求体或鉴权。接口会清除 `refreshToken` Cookie，并返回 `data: null`。访问令牌需要由客户端自行丢弃。
