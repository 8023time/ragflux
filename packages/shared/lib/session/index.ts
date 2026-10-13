/** 创建会话。 */
export interface CreateSessionRequest {
  datasetId: number;
  title?: string;
}

/** 按知识库筛选会话。 */
export interface ListSessionsRequest {
  datasetId?: number;
}

/** 修改会话标题。 */
export interface UpdateSessionRequest {
  title: string;
}

/** 会话视图。 */
export interface SessionView {
  id: number;
  datasetId: number;
  title: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

/** 消息引用的分块信息。 */
export interface CitationView {
  position: number;
  chunkId: string;
  score: number;
}

/** 会话消息视图。 */
export interface MessageView {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  citations: CitationView[];
}

/** 问答请求。回答通过 SSE 推送，不走统一 JSON 包装。 */
export interface ChatCompletionRequest {
  sessionId: number;
  content: string;
}

/** 问答 SSE 事件。 */
export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; messageId: number; citations: CitationView[] }
  | { type: 'error'; message: string };
