import { z } from 'zod';

export const datasetFormSchema = z.object({
  name: z.string().trim().min(1, '请输入知识库名称').max(128, '名称不能超过 128 个字符'),
  description: z.string().trim(),
  chunkStrategy: z.enum(['general', 'book', 'paper', 'resume', 'qa']),
  embedModelId: z.number().int().positive().nullable(),
  visionModelId: z.number().int().min(0).nullable(),
});
