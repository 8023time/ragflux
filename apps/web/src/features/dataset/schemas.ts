import { z } from "zod";

export const datasetFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "请输入知识库名称")
      .max(128, "名称不能超过 128 个字符"),
    description: z.string().trim(),
    chunkStrategy: z.enum(["general", "book", "paper", "resume", "qa"]),
    embedModelId: z.number().int().positive().nullable(),
    visionModelId: z.number().int().min(0).nullable(),
  });

export const modelConnectionSchema = z.object({
  modelId: z.string().trim().min(1, "请填写模型 ID"),
  apiUrl: z
    .string()
    .trim()
    .min(1, "请填写接口地址")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "请填写有效的接口地址"),
  apiKey: z.string().trim().min(1, "请填写密钥"),
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
