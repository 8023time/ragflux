export const PIPELINE = new Set(['pending', 'parsing', 'chunking', 'embedding', 'cancelling']);

export const STATUS_TEXT: Record<string, string> = {
  pending: '排队中',
  parsing: '解析中',
  chunking: '分块中',
  embedding: '向量化',
  done: '已完成',
  failed: '失败',
  cancelling: '正在停止',
  cancelled: '已停止',
};
