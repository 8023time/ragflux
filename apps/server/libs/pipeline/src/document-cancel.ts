/** 停止解析时写入的标记。图在每个节点开始前读取，读到就改为 cancelled。 */
export function documentCancelKey(documentId: number): string {
  return `document:cancel:${documentId}`;
}

export const DOCUMENT_CANCEL_TTL_SECONDS = 24 * 60 * 60;
