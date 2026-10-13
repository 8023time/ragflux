# `@ragflux/config`

`@ragflux/config` 是 ragflux monorepo 的全局静态配置包，为 Web 和 Server 提供统一的应用名称、环境地址和服务端口配置。

本包只提供源码中的共享静态配置，不读取环境变量，也不负责运行时配置校验。服务端的数据库、Redis、LLM、对象存储等敏感配置由 `apps/server/libs/config` 从环境变量加载。

## 安装与导入

本包通过 workspace 依赖使用：

```json
{
  "dependencies": {
    "@ragflux/config": "workspace:*"
  }
}
```
从包入口导入配置：

```ts
import { globalConfig } from "@ragflux/config";
import type { GlobalConfig } from "@ragflux/config";
```

不要从 `lib/` 或 `dist/` 的内部路径导入。

## 导出内容

### `globalConfig`

全局配置对象包含以下内容：

| 路径                       | 说明                                              |
| -------------------------- | ------------------------------------------------- |
| `name`                     | 应用名称，当前为 `ragflux`                        |
| `development.urls.web`     | 开发环境 Web 地址，当前为 `http://localhost:3000` |
| `development.urls.api`     | 开发环境 API 地址，当前为 `http://localhost:3001` |
| `development.ports.web`    | 开发环境 Web 端口，当前为 `3000`                  |
| `development.ports.api`    | 开发环境 API 端口，当前为 `3001`                  |
| `development.ports.relay`  | 开发环境 Relay 端口，当前为 `3002`                |
| `development.ports.worker` | 开发环境 Worker 端口，当前为 `3003`               |
| `production.hosts.web`     | 生产环境 Web 主机地址                             |
| `production.hosts.api`     | 生产环境 API 主机地址                             |
| `production.ports.*`       | 生产环境各服务端口                                |

示例：

```ts
import { globalConfig } from "@ragflux/config";

const apiUrl = globalConfig.development.urls.api;
const apiPort = globalConfig.development.ports.api;
```

### `GlobalConfig`

`GlobalConfig` 是由 `globalConfig` 自动推导的 TypeScript 类型。配置对象结构变化时，该类型会同步更新：

```ts
import type { GlobalConfig } from "@ragflux/config";

function getApiUrl(config: GlobalConfig, production: boolean) {
  return production
    ? config.production.hosts.api
    : config.development.urls.api;
}
```

## 配置边界

- 仅添加跨应用共享且不敏感的静态值。
- 不要在本包保存 API 密钥、JWT 密钥、数据库密码或其他 secret。
- 不要在本包读取 `process.env`、加载 `.env` 或实现运行时校验。
- 修改地址、端口或配置层级后，应检查 Web、Server 和 CORS 默认配置的所有消费者。

## 构建

在仓库根目录执行：

```bash
pnpm --filter @ragflux/config build
```

构建会生成 `dist/index.mjs` 和类型声明文件。`dist/` 是构建产物，不应手工编辑；源码入口为 `lib/index.ts`。