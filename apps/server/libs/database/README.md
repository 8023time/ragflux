# Database

服务端共享数据库库。用 Prisma 8 连接 PostgreSQL，把客户端挂在全局 `DatabaseService` 上。数据契约描述个人知识库的用户、知识库、文档、分块、会话和 Outbox。

通过 `@libs/database` 引入。连接信息来自 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_DATABASE`，与 `@libs/config` 使用同一组变量。未设置时主机为 `localhost`，端口为 `5432`。

## 能力

| 导出              | 作用                                                         |
| ----------------- | ------------------------------------------------------------ |
| `DatabaseModule`  | 导出 `DatabaseService`                                       |
| `DatabaseService` | 暴露 Prisma 客户端 `client`，应用关闭时调用 `client.close()` |

客户端在 `src/prisma/db.ts` 中创建：读取 `.env`，用 `@prisma/orm-postgres` 按已生成的契约连接数据库。

## 数据模型

数据库契约的源文件是 [`src/prisma/contract.prisma`](src/prisma/contract.prisma)。所有模型都位于 PostgreSQL 的 `public` schema 中；数据库表名通过 Prisma 的 `@@map` 显式指定。

| 模型              | 表                   | 说明           |
| ----------------- | -------------------- | -------------- |
| `User`            | `t_user`             | 用户           |
| `Dataset`         | `t_dataset`          | 知识库         |
| `EmbedModel`      | `t_embed_model`      | 向量模型       |
| `VisionModel`     | `t_vision_model`     | 视觉模型       |
| `Document`        | `t_document`         | 文档及解析进度 |
| `Chunk`           | `t_chunk`            | 文档分块       |
| `Outbox`          | `t_outbox`           | 待发布事件     |
| `Session`         | `t_session`          | 会话           |
| `Message`         | `t_message`          | 会话消息       |
| `MessageCitation` | `t_message_citation` | 消息引用的分块 |

`contract.json` 和 `contract.d.ts` 都是由契约自动生成的文件，请勿直接编辑。修改 `contract.prisma` 后，进入 `apps/server` 目录执行：

```bash
pnpm prisma:emit
```

该命令会根据源契约更新 `contract.json` 和 `contract.d.ts`，供运行时和 TypeScript 类型检查使用。

### 数据库结构同步与迁移

在本地开发环境中，如果只需要将当前契约直接同步到数据库，可以执行：

```bash
pnpm prisma:update
```

如果需要保留可追踪、可审查的迁移记录，请使用迁移流程：

```bash
pnpm prisma:plan   # 根据契约变更生成迁移
pnpm prisma:apply  # 执行待应用的迁移
pnpm prisma:status # 查看迁移状态
```

`prisma:update` 适合本地快速同步；团队协作、测试环境和生产环境应优先使用迁移流程。首次初始化空数据库时，可执行：

```bash
pnpm prisma:init
```

以上命令均应在 `apps/server` 目录下执行。数据库连接配置位于 [`apps/server/prisma.config.ts`](../../prisma.config.ts)。

### pgvector

服务启动时，`VectorStoreService` 会确保 PostgreSQL 已安装 `vector` 扩展，并在 `t_chunk` 上增加
`embedding`、`embedding_model` 和 `embedding_dimensions` 字段。向量直接和分块文本保存在同一张表中；
查询会同时限制 `dataset_id`、模型标识和向量维度，避免跨模型比较向量。

由于当前 Prisma 8 Contract 尚未提供项目可直接导入的 pgvector 扩展包，`contract.prisma` 中的
`embedding` 使用 `Json?` 作为可迁移的字段声明；应用启动时会将该列校正为 PostgreSQL 的无固定维度
`vector` 类型。实际读写和检索均使用 pgvector，不会把向量当作 JSON 处理。

Worker 在文档切分完成后生成并持久化分块向量，API 检索时只生成查询向量，再由 PostgreSQL 使用
`<=>` 余弦距离运算排序。当前向量列是变维度的，因此使用精确距离扫描和普通 `(dataset_id, embedding_model)`
索引；如果后续统一所有嵌入模型维度，可以将列改为固定维度并增加 HNSW 索引。

## 使用

在使用数据库的模块中导入：

```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@libs/database';

@Module({
  imports: [DatabaseModule],
})
export class XXXModule {} 
```

通过 `client.orm.public.<Model>` 查询：

```ts
constructor(private readonly database: DatabaseService) {}

const user = await this.database.client.orm.public.User
  .where((user) => user.email.eq(email))
  .first();
```

ORM 用模型名，例如 `client.orm.public.Document`。需要手写 SQL 时用存储表名，例如 `client.sql.public.t_document`。
