/** 文档分块视图。 */
export interface ChunkView {
  id: string;
  documentId: number;
  datasetId: number;
  chunkIndex: number;
  content: string;
  tokenNum: number;
  imageKey: string;
  elementType: string;
  pageNumber: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 修改分块内容或启用状态，不会重新切分文档。 */
export interface UpdateChunkRequest {
  content?: string;
  enabled?: boolean;
}
