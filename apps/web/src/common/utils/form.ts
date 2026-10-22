import type { z } from 'zod';

export function formError(error: z.ZodError) {
  return error.issues[0]?.message ?? '请检查输入';
}
