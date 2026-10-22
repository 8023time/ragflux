# Redis

服务端共享 Redis 库。用 [ioredis](https://github.com/redis/ioredis) 建一个通用客户端，业务通过 `client` 调用任意命令。

通过 `@libs/redis` 引入。连接信息来自 `@libs/config` 的 `redis`。对应环境变量是 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`、`REDIS_DB`，模板见 `apps/server/.env.example`。

未设置时主机为 `localhost`，端口为 `6379`，密码为空，数据库编号为 `0`。密码为空时不发送 AUTH。

## 能力

| 导出           | 作用                                                       |
| -------------- | ---------------------------------------------------------- |
| `RedisModule`  | 注册并导出 `RedisService`，不是全局模块，使用处需要导入    |
| `RedisService` | 持有 ioredis 客户端，模块初始化时连接，应用关闭时 `quit()` |

`client` 就是 ioredis 实例。读取、写入、过期、发布订阅等都直接调用它，本库不封装具体业务命令。

连接失败时 `onModuleInit` 抛出错误，应用无法完成启动。运行中的连接错误记 error 日志。

## 使用

应用需要先导入全局的 `AppConfigModule`。在要用 Redis 的模块中导入：

```ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@libs/redis';

@Module({
  imports: [RedisModule],
})
export class FeatureModule {}
```

调用命令：

```ts
constructor(private readonly redis: RedisService) {}

await this.redis.client.set('key', 'value', 'EX', 300);
const value = await this.redis.client.get('key');
await this.redis.client.del('key');
```
