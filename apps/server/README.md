# Server

Ragflux 后端，是一个 NestJS monorepo。三个进程共用 `libs/` 里的库，库通过 `@libs/<name>` 引入。环境变量模板是 `.env.example`，复制为 `.env` 后启动。

## 应用

| 应用     | 目录          | 默认端口 | 说明                                                                  |
| -------- | ------------- | -------- | --------------------------------------------------------------------- |
| `api`    | `apps/api`    | `3001`   | HTTP 接口。全局前缀 `/api`，URI 版本默认 `v1`，路由形如 `/api/v1/...` |
| `relay`  | `apps/relay`  | `3002`   | 已监听端口，只加载配置                                                |
| `worker` | `apps/worker` | `3003`   | 已监听端口，只加载配置                                                |

端口来自 `PORT`、`RELAY_PORT`、`WORKER_PORT`，未设置时用上表默认值。

API 启动时注册 `@libs/common` 的响应拦截器与异常过滤器，并按 `CORS_ORIGINS` 开启跨域。当前接入了配置、统一响应、数据库和一个空的认证模块。

## 共享库

| 库         | 引入路径         | 说明                                                               |
| ---------- | ---------------- | ------------------------------------------------------------------ |
| `config`   | `@libs/config`   | 读取并校验 `.env`，见 [libs/config](libs/config/README.md)         |
| `common`   | `@libs/common`   | 统一 HTTP 响应，见 [libs/common](libs/common/README.md)            |
| `auth`     | `@libs/auth`     | 密码哈希与 JWT，见 [libs/auth](libs/auth/README.md)                |
| `database` | `@libs/database` | PostgreSQL / Prisma 8，见 [libs/database](libs/database/README.md) |
| `mail`     | `@libs/mail`     | Resend 验证码邮件，见 [libs/mail](libs/mail/README.md)             |
| `redis`    | `@libs/redis`    | 通用 Redis 客户端，见 [libs/redis](libs/redis/README.md)           |
| `storage`  | `@libs/storage`  | 按 R2 配置创建了 S3 客户端，上传等接口尚未实现                     |
| `llm`      | `@libs/llm`      | 模块已注册，对话、视觉、向量调用尚未实现                           |
| `queue`    | `@libs/queue`    | 模块已注册，消息队列尚未实现                                       |
| `pipeline` | `@libs/pipeline` | 模块已注册，文档解析流水线尚未实现                                 |

## 开发

在仓库根目录：

```bash
pnpm dev:server
```

或进入 `apps/server`：

```bash
pnpm dev
```

`pnpm dev` 会同时启动 API、Relay 和 Worker。只启动其中一个用 `pnpm dev:api`、`pnpm dev:relay` 或 `pnpm dev:worker`。

构建与运行：

```bash
pnpm build
pnpm start
```

数据库契约与迁移命令见 [libs/database](libs/database/README.md)。配置项见 [libs/config](libs/config/README.md)。
