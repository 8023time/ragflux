/** 申请原文件的预签名上传地址。 */
export interface CreateUploadUrlRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** 预签名上传地址及其请求信息。 */
export interface UploadUrlResponse {
  r2Key: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}

/** 前端直传完成后登记文档，此时尚未解析。 */
export interface RegisterDocumentRequest {
  name: string;
  r2Key: string;
  fileHash: string;
  sizeBytes: number;
}

/** 修改文档启用状态。 */
export interface UpdateDocumentRequest {
  enabled: boolean;
}

/** 批量查询文档解析进度。 */
export interface BatchDocumentStatusRequest {
  documentIds: number[];
}

/** 文档视图。 */
export interface DocumentView {
  id: number;
  datasetId: number;
  name: string;
  r2Key: string;
  fileHash: string;
  sizeBytes: number;
  status: string;
  progress: number;
  parseVersion: number;
  enabled: boolean;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 文档解析进度。 */
export interface DocumentProgress {
  id: number;
  status: string;
  progress: number;
  parseVersion: number;
  lastError: string | null;
}

/** 文档预览或下载链接。 */
export interface DocumentLink {
  url: string;
  expiresAt: string;
}

/** 文档解析任务提交结果。 */
export interface ParseDocumentResult {
  documentId: number;
  parseVersion: number;
  status: string;
}
