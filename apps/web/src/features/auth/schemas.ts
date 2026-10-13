import { z } from "zod";

export const sendCodeSchema = z.object({
  email: z.string().trim().pipe(z.email("请输入正确的邮箱地址")),
});

export const loginSchema = sendCodeSchema.extend({
  code: z
    .string()
    .trim()
    .min(1, "请输入验证码")
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().min(1, "请输入验证码")),
});
