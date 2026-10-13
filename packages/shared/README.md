# `@ragflux/shared`

`@ragflux/shared` 是 ragflux monorepo 的前后端共享类型包，用于统一 API 请求、响应、领域视图和流式事件的 TypeScript 契约。

Web 和 Server 都应复用本包中的类型，避免在各自应用中重复声明接口。该包不包含运行时校验、HTTP 客户端、NestJS DTO 装饰器或数据库模型。

## 安装与导入

本包通过 workspace 依赖使用：

```json
{
  "dependencies": {
    "@ragflux/shared": "workspace:*"
  }
}
```

按领域子路径导入类型：

```ts
import type { AuthUser, LoginResponse } from "@ragflux/shared/auth";
import type { DocumentView } from "@ragflux/shared/document";
import type { ChatStreamEvent } from "@ragflux/shared/session";
```

当前不提供 `@ragflux/shared` 根路径导出，也不要从 `lib/` 或 `dist/` 内部路径导入。

## 类型模块

| 子路径 | 主要类型 | 用途 |
| --- | --- | --- |
| `@ragflux/shared/auth` | `SendCodeRequest`、`LoginRequest`、`AuthUser`、`LoginResponse` | 验证码登录和用户信息 |
| `@ragflux/shared/model` | `CreateModelRequest`、`UpdateModelRequest`、`ModelView`、`DefaultModels` | 嵌入/视觉模型配置 |
| `@ragflux/shared/dataset` | `CreateDatasetRequest`、`UpdateDatasetRequest`、`DatasetView` | 知识库创建、配置更新和返回视图 |
| `@ragflux/shared/document` | `CreateUploadUrlRequest`、`DocumentView`、`DocumentProgress` | 文件上传、文档登记和解析状态 |
| `@ragflux/shared/chunk` | `ChunkView`、`UpdateChunkRequest` | 文档分块查看和更新 |
| `@ragflux/shared/retrieval` | `RetrievalTestRequest`、`RetrievalHit` | 检索测试和命中结果 |
| `@ragflux/shared/session` | `CreateSessionRequest`、`ListSessionsRequest`、`SessionView`、`MessageView`、`ChatCompletionRequest` | 会话、消息和问答 |

## 使用示例

### API 请求类型

共享请求类型可以用于约束前端请求体，也可以由 Server 的 DTO 实现：

```ts
import type { CreateUploadUrlRequest } from "@ragflux/shared/document";

const request: CreateUploadUrlRequest = {
  fileName: "guide.pdf",
  contentType: "application/pdf",
  sizeBytes: 1024,
};
```

Server 仍需使用自己的运行时校验（例如 `class-validator` 或 Zod）；TypeScript 类型不会在运行时验证用户输入。

### API 响应类型

```ts
import type { DocumentView } from "@ragflux/shared/document";

function getDocumentLabel(document: DocumentView) {
  return `${document.name} (${document.progress}%)`;
}
```

### SSE 事件

问答接口的响应通过 SSE 推送，使用 `ChatStreamEvent` 的 `type` 字段区分事件：

```ts
import type { ChatStreamEvent } from "@ragflux/shared/session";

function handleChatEvent(event: ChatStreamEvent) {
  switch (event.type) {
    case "delta":
      return event.content;
    case "done":
      return event.citations;
    case "error":
      throw new Error(event.message);
  }
}
```

当前事件类型为：

- `delta`：增量回答文本；
- `done`：回答结束，包含消息 ID 和引用；
- `error`：回答处理失败及错误信息。

## 类型和兼容性约定

- 时间字段使用 API 返回的 ISO 字符串。
- 请求类型以 `Request` 结尾，列表或返回对象通常以 `View` 结尾。
- 有独立业务结构的接口返回类型使用 `Response`、`View` 或 `Result` 命名；直接返回列表或已有视图时不要额外创建重复别名，没有业务数据的成功响应使用 `null`。
- 修改现有字段、字段类型、可选性或 SSE 联合分支前，必须检查 Web、Server 和相关文档的消费者。
- 新增领域时，需要同时添加 `lib/<领域>/index.ts`、`package.json` 的 `exports` 和 `tsup.config.ts` 的构建入口。
- 不要在共享类型中加入 secret、环境变量、运行时常量或应用内部临时状态。

## 构建

在仓库根目录执行：

```bash
pnpm --filter @ragflux/shared build
```

构建会为每个领域生成 `dist/<领域>/index.mjs` 和对应的 `.d.ts` 声明文件。`dist/` 是构建产物，不应手工编辑；源码入口位于 `lib/`。