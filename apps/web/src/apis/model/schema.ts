import { z } from 'zod';

export const modelConnectionSchema = z.object({
  modelId: z.string().trim().min(1, '请填写模型 ID'),
  apiUrl: z
    .string()
    .trim()
    .min(1, '请填写接口地址')
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, '请填写有效的接口地址'),
  apiKey: z.string().trim().min(1, '请填写密钥'),
});

export const modelSaveSchema = modelConnectionSchema
  .extend({
    name: z.string().trim(),
  })
  .transform((value) => ({
    name: value.name || value.modelId,
    modelId: value.modelId,
    apiUrl: value.apiUrl,
    apiKey: value.apiKey,
  }));
