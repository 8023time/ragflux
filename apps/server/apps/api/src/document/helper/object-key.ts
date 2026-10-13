/** 对象键限定在当前用户目录下，避免登记别人的文件。 */
export function userDocumentPrefix(userId: number): string {
  return `users/${userId}/documents/`;
}

export function safeFileName(name: string): string {
  const base = name.trim().split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^\w.\-\u4e00-\u9fff]+/g, '_').slice(0, 120);
  return cleaned || 'file';
}

export function isUserObjectKey(userId: number, key: string): boolean {
  const prefix = userDocumentPrefix(userId);
  return key.startsWith(prefix) && !key.split('/').includes('..');
}
