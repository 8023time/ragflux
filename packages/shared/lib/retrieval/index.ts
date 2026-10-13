/** 检索测试请求。 */
export interface RetrievalTestRequest {
  datasetId: number;
  query: string;
  topK?: number;
}

/** 检索命中的分块。 */
export interface RetrievalHit {
  chunkId: string;
  documentName: string;
  content: string;
  score: number;
}
