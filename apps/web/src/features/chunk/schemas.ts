import { z } from "zod";

export const chunkContentSchema = z.string().trim().min(1, "分块内容不能为空");
