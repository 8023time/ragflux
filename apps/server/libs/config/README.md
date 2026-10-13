# Config

服务端共享配置库。启动时读取 `apps/server/.env`，用 Zod 校验环境变量，再整理成类型化的 `AppConfig`，通过 Nest `ConfigModule` 全局注入。

通过 `@libs/config` 引入。变量模板见 `apps/server/.env.example`。

## 能力

| 导出              | 作用                                                            |
| ----------------- | --------------------------------------------------------------- |
| `AppConfigModule` | 全局加载 `.env` 并注册 `loadAppConfig`，开启配置缓存            |
| `loadAppConfig`   | 校验 `process.env` 并返回配置对象；校验失败时抛错，应用无法启动 |
| `AppConfig`       | `loadAppConfig` 的返回类型                                      |

`AppConfigModule` 把 `@nestjs/config` 设为全局模块，各应用导入一次即可注入 `ConfigService`。

## 配置结构

| 字段             | 来源                                              | 说明                          |
| ---------------- | ------------------------------------------------- | ----------------------------- |
| `environment`    | `NODE_ENV`                                        | `development` 或 `production` |
| `isProduction`   | `NODE_ENV`                                        | 是否为 `production`           |
| `server`         | `PORT` / `RELAY_PORT` / `WORKER_PORT`             | API、Relay、Worker 端口       |
| `cors.origins`   | `CORS_ORIGINS`                                    | 逗号分隔，去空白后的来源列表  |
| `database`       | `DB_*`                                            | PostgreSQL 连接信息           |
| `storage.r2`     | `R2_*`                                            | Cloudflare R2 / S3 兼容存储   |
| `auth.secret`    | `JWT_SECRET`                                      | JWT 签名密钥                  |
| `auth.expiresIn` | 代码固定                                          | access `15m`，refresh `7d`    |
| `llm`            | `LLM_CHAT_*` / `LLM_VISION_*` / `LLM_EMBEDDING_*` | 对话、视觉、向量三个模型      |
| `mail.resend`    | `RESEND_API_KEY` / `RESEND_FROM_EMAIL`            | Resend 发信                   |
| `redis`          | `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Redis 连接信息     |
| `queue.url`      | `RABBITMQ_URL`                                    | RabbitMQ 连接地址，默认 `amqp://127.0.0.1:5672` |

未设置时的默认值：`NODE_ENV` 为 `development`，`PORT` 为 `3001`，`RELAY_PORT` 为 `3002`，`WORKER_PORT` 为 `3003`，`CORS_ORIGINS` 为 `http://127.0.0.1:3000`，`DB_HOST` 为 `localhost`，`DB_PORT` 为 `5432`，`DB_PASSWORD` 为空字符串，`REDIS_HOST` 为 `localhost`，`REDIS_PORT` 为 `6379`，`REDIS_PASSWORD` 为空字符串，`REDIS_DB` 为 `0`，`RABBITMQ_URL` 为 `amqp://127.0.0.1:5672`。端口与本地前端地址来自 `@ragflux/config` 的开发配置。

`DB_USER`、`DB_DATABASE`、全部 `R2_*`、`JWT_SECRET`、全部 `LLM_*`、`RESEND_API_KEY` 必须非空。`RESEND_FROM_EMAIL` 必须是合法邮箱。缺项或格式不对时，错误信息会逐条列出变量名。

## 使用

在应用模块中导入：

```ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from '@libs/config';

@Module({
  imports: [AppConfigModule],
})
export class AppModule {}
```

读取配置：

```ts
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@libs/config';

constructor(private readonly configService: ConfigService<AppConfig, true>) {}

const port = this.configService.get('server.port', { infer: true });
const secret = this.configService.get('auth.secret', { infer: true });
```

启动入口里也可以直接取出整段配置：

```ts
const config = app.get(ConfigService<AppConfig>);
const { port } = config.getOrThrow<AppConfig['server']>('server');
```
