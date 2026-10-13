import { z } from "zod";

export const retrievalSchema = z.object({
  query: z.string().trim().min(1, "请输入检索内容"),
  topK: z.number().int().min(1).max(20),
});
