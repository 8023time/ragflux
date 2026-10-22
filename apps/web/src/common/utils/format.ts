export function formatRelativeTime(iso: string) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '';
  const delta = Date.now() - time;
  if (delta < 60_000) return '刚刚';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function nameInitial(value: string) {
  const text = value.trim();
  return (text.slice(0, 1) || '?').toUpperCase();
}

export function fileExtension(name: string) {
  const base = name.trim().split(/[/\\]/).pop() ?? '';
  const index = base.lastIndexOf('.');
  if (index <= 0) return '';
  return base.slice(index + 1).toLowerCase();
}

export function contentTypeForName(name: string) {
  switch (fileExtension(name)) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'txt':
    case 'md':
    case 'markdown':
      return 'text/plain; charset=utf-8';
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

export async function hashFile(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const ACCEPT_FILES = '.txt,.csv,.md,.markdown,.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.bmp';

export const CHUNK_STRATEGIES = [
  {
    value: 'general',
    label: '通用文档',
    description: '普通文本、Markdown 与常规办公文档',
  },
  { value: 'book', label: '书籍', description: '按章、节组织长篇书籍与教材' },
  {
    value: 'paper',
    label: '学术论文',
    description: '保留摘要、章节、表格与公式结构',
  },
  {
    value: 'resume',
    label: '简历',
    description: '按信息、经历、教育与技能组织',
  },
  {
    value: 'qa',
    label: '问答对',
    description: '一组问题与答案生成一个独立分块',
  },
] as const;

export function strategyLabel(value: string) {
  const normalized = value === 'recursive' || value === 'fixed' || !value ? 'general' : value;
  return CHUNK_STRATEGIES.find((item) => item.value === normalized)?.label ?? '通用文档';
}
