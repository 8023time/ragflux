# Mail

服务端共享邮件库。通过 [Resend](https://resend.com) 发送验证码邮件，发件人与密钥来自 `@libs/config` 的 `mail.resend`。

通过 `@libs/mail` 引入。对应环境变量是 `RESEND_API_KEY` 与 `RESEND_FROM_EMAIL`，模板见 `apps/server/.env.example`。

## 能力

| 导出          | 作用                                                   |
| ------------- | ------------------------------------------------------ |
| `MailModule`  | 注册并导出 `MailService`，不是全局模块，使用处需要导入 |
| `MailService` | 调用 Resend 发送验证码邮件                             |

`MailService` 只提供 `sendVerificationCode(email, code)`。主题为 `ragflux 验证码`，正文是一封 HTML 邮件，展示验证码，并提示 5 分钟后失效。这里的 5 分钟只写在邮件文案里，过期校验由调用方自己实现。

Resend 返回错误时记 error 日志，并抛出 `503 Service Unavailable`，消息为「验证码发送失败，请稍后重试」。成功时记日志并返回 Resend 的发送结果，其中包含 `id`。

## 使用

在使用邮件的模块中导入。应用需要先导入全局的 `AppConfigModule`，`MailService` 才能读到配置。

```ts
import { Module } from '@nestjs/common';
import { MailModule } from '@libs/mail';

@Module({
  imports: [MailModule],
})
export class AuthModule {}
```

发送验证码：

```ts
constructor(private readonly mailService: MailService) {}

const result = await this.mailService.sendVerificationCode(email, code);
```
