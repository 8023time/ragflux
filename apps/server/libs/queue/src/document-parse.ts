/** Outbox topic 与队列同名。消息里只有文档编号和解析版本，正文在 PostgreSQL。 */
export const DOCUMENT_PARSE_TOPIC = 'document.parse';

export type DocumentParseMessage = {
  documentId: number;
  parseVersion: number;
};

export function readDocumentParseMessage(payload: unknown): DocumentParseMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const documentId = Number(record.documentId);
  const parseVersion = Number(record.parseVersion);
  if (!Number.isInteger(documentId) || documentId <= 0 || !Number.isInteger(parseVersion) || parseVersion <= 0) {
    return null;
  }
  return { documentId, parseVersion };
}
