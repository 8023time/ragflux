# Common

服务端共享基础库，统一 HTTP 成功响应与异常响应的结构。业务接口返回 `{ code, msg, data }`，异常由全局过滤器转成同一套字段。

通过 `@libs/common` 引入。

## 能力

| 导出                      | 作用                                                   |
| ------------------------- | ------------------------------------------------------ |
| `ResponseModule`          | 全局模块，导出 `ResponseService`                       |
| `ResponseService`         | 组装成功（`code: 0`）与失败（`code: 1`）响应           |
| `ResponseCode`            | 业务码：`SUCCESS = 0`、`ERROR = 1`                     |
| `HttpResponseInterceptor` | 透传响应字段，并把 `data` 中的 `bigint` 转成字符串     |
| `HttpExceptionFilter`     | 捕获 `HttpException`，按 HTTP 状态码返回错误体并写日志 |

## 响应结构

成功与业务失败都由控制器返回，HTTP 状态码保持 200：

```json
{ "code": 0, "msg": "success", "data": {} }
```

```json
{ "code": 1, "msg": "error", "data": null }
```

HTTP 异常由过滤器返回，HTTP 状态码与 `code` 一致：

```json
{ "code": 400, "msg": "Bad Request Exception", "details": ["email 不能为空"] }
```

`details` 只在 `ValidationPipe` 给出校验信息数组时出现，内容是各条原始校验信息。普通异常不带这个字段。5xx 记 error 日志并附带堆栈，4xx 记 warn 日志。

## 使用

在应用模块中导入（`ResponseModule` 是全局模块，导入一次即可在各处注入 `ResponseService`）：

```ts
import { Module } from '@nestjs/common';
import { ResponseModule } from '@libs/common';

@Module({
  imports: [ResponseModule],
})
export class AppModule {}
```

在启动时注册拦截器与过滤器：

```ts
import { HttpResponseInterceptor, HttpExceptionFilter } from '@libs/common';

app.useGlobalInterceptors(new HttpResponseInterceptor());
app.useGlobalFilters(new HttpExceptionFilter());
```

控制器里用 `ResponseService` 返回数据：

```ts
@Get()
list() {
  return this.responseService.success(items);
}

@Post()
create() {
  return this.responseService.error(null, '创建失败');
}
```

响应体类型使用 `@ragflux/shared/common` 的 `ApiResponse<T>`。拦截器假定返回值已经是这个信封。它会递归遍历 `data`：`bigint` 转为字符串，避免超过 `Number.MAX_SAFE_INTEGER` 时丢精度；`Date` 保持原样；`data` 缺失时写成 `null`。
