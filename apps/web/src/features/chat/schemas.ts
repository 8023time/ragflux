import { z } from "zod";

export const chatMessageSchema = z.string().trim().min(1);
