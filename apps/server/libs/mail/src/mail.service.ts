import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@libs/config';
import { Resend } from 'resend';
import { globalConfig } from '@ragflux/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: Resend;
  private readonly from: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    const { apiKey, from } = configService.get('mail.resend', { infer: true });
    this.client = new Resend(apiKey);
    this.from = from;
  }

  /**
   * 发送验证码
   * @param email 邮箱
   * @param code 验证码
   * @returns 发送结果
   */
  async sendVerificationCode(email: string, code: string) {
    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: email,
      subject: `${globalConfig.name} 验证码`,
      html: this.sendVerificationCodeHtml(code),
    });

    if (error) {
      this.logger.error(`Resend 发信失败: ${error.message}`, { email, error });
      throw new ServiceUnavailableException('验证码发送失败，请稍后重试');
    }

    this.logger.log(`验证码已发送至 ${email}, messageId=${data?.id}`);
    return data;
  }

  /**
   * 生成验证码 HTML
   *
   * @param code 验证码
   * @param expirationMinutes 过期时间（分钟）
   * @returns 验证码 HTML
   */
  private sendVerificationCodeHtml(code: string, expirationMinutes: number = 5): string {
    return `
<div style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;">
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:radial-gradient(circle at 10% 90%, rgba(83,220,224,.32), transparent 30%),radial-gradient(circle at 90% 90%, rgba(255,130,130,.28), transparent 32%),radial-gradient(circle at 50% 100%, rgba(255,210,80,.28), transparent 35%),linear-gradient(135deg,#fafafa 0%,#f7f7f5 100%);border:1px solid #e7e7e5;border-radius:20px;overflow:hidden;">
        <!-- 顶部渐变条 -->
        <tr>
          <td style="height:6px;padding:0;margin:0;background:linear-gradient(90deg,#53dce0 0%,#ff8282 50%,#ffd250 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
            <td style="padding:48px 36px;">
              <!-- Header -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align:center;">
                    <div style="display:inline-block;font-size:13px;line-height:20px;font-weight:600;color:#181818;letter-spacing:-.01em;">${globalConfig.name}</div>
                    <h1 style="margin:20px 0 10px;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-.04em;color:#181818;">验证您的邮箱</h1>
                    <p style="max-width:420px;margin:0 auto;font-size:14px;line-height:1.7;color:#6b6b6b;">使用下面的验证码完成邮箱验证。验证码将在 ${expirationMinutes} 分钟后失效。</p>
                  </td>
                </tr>
              </table>
              <!-- 间距 -->
              <div style="height:28px;line-height:28px;">&nbsp;</div>
              <!-- 验证码 Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="72%" style="background:#f3f3f1;border:1px solid #e0e0de;border-radius:10px;">
                      <tr>
                        <td style="padding:15px 16px;text-align:center;">
                          <div style="font-family:'SF Mono',Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:32px;line-height:40px;font-weight:400;letter-spacing:10px;color:#171717;">${code}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;font-size:12px;line-height:1.7;color:#8c8c8c;">如果这不是您本人的操作，请忽略此邮件。</p>
                    <p style="margin:6px 0 0;font-size:12px;line-height:1.7;color:#a3a3a3;">请勿将验证码提供给任何人。</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Bottom -->
        <p style="margin:18px 0 0;text-align:center;font-size:11px;line-height:1.5;color:#a0a0a0;">此邮件由系统自动发送，请勿直接回复。</p>
      </td>
    </tr>
  </table>
</div>`;
  }
}
