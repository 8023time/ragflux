const TEXT_EXTENSIONS = new Set(['txt', 'csv', 'md', 'markdown']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);
const SUPPORTED = new Set([...TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS, 'docx', 'xlsx', 'pdf']);

export function fileExtension(name: string): string {
  const base = name.trim().split(/[/\\]/).pop() ?? '';
  const index = base.lastIndexOf('.');
  if (index <= 0) {
    return '';
  }
  return base.slice(index + 1).toLowerCase();
}

export function isSupportedDocument(name: string): boolean {
  return SUPPORTED.has(fileExtension(name));
}

export function isImageExtension(extension: string): boolean {
  return IMAGE_EXTENSIONS.has(extension);
}

export function contentTypeForExtension(extension: string): string {
  switch (extension) {
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

export function imageMimeType(extension: string): string {
  return contentTypeForExtension(extension).split(';')[0] ?? 'application/octet-stream';
}
