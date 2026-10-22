import { z } from 'zod';

export const sendCodeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('请输入正确的邮箱地址')),
});

export const loginSchema = sendCodeSchema.extend({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, '请输入 6 位数字验证码'),
});
