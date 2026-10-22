import type { ApiResponse } from '@ragflux/shared/common';
import type {
  BatchDocumentStatusRequest,
  CreateUploadUrlRequest,
  DocumentLink,
  DocumentProgress,
  DocumentView,
  ParseDocumentResult,
  RegisterDocumentRequest,
  UpdateDocumentRequest,
  UploadUrlResponse,
} from '@ragflux/shared/document';
import { ApiError, http } from '@/common/utils/api-request';

/**
 * 申请原文件的预签名上传地址。
 * @param body 文件名、类型与大小
 * @returns 预签名地址及请求信息
 */
export async function createUploadUrl(body: CreateUploadUrlRequest): Promise<ApiResponse<UploadUrlResponse>> {
  return http.post<UploadUrlResponse>('/documents/upload-url', body);
}

/**
 * 列出知识库下的文档。
 * @param datasetId 知识库编号
 * @returns 文档列表
 */
export async function listDocuments(datasetId: number): Promise<ApiResponse<DocumentView[]>> {
  return http.get<DocumentView[]>(`/datasets/${datasetId}/documents`);
}

/**
 * 在直传完成后登记文档，此时尚未解析。
 * @param datasetId 知识库编号
 * @param body 文件名、对象键、哈希与大小
 * @returns 登记后的文档
 */
export async function registerDocument(
  datasetId: number,
  body: RegisterDocumentRequest,
): Promise<ApiResponse<DocumentView>> {
  return http.post<DocumentView>(`/datasets/${datasetId}/documents`, body);
}

/**
 * 获取文档详情。
 * @param documentId 文档编号
 * @returns 文档视图
 */
export async function getDocument(documentId: number): Promise<ApiResponse<DocumentView>> {
  return http.get<DocumentView>(`/documents/${documentId}`);
}

/**
 * 修改文档启用状态。
 * @param documentId 文档编号
 * @param body 是否启用
 * @returns 更新后的文档
 */
export async function updateDocument(
  documentId: number,
  body: UpdateDocumentRequest,
): Promise<ApiResponse<DocumentView>> {
  return http.put<DocumentView>(`/documents/${documentId}`, body);
}

/**
 * 删除文档及其存储对象。
 * @param documentId 文档编号
 * @returns 统一响应，成功时 data 为 null
 */
export async function deleteDocument(documentId: number): Promise<ApiResponse<null>> {
  return http.delete<null>(`/documents/${documentId}`);
}

/**
 * 批量查询文档解析进度。
 * @param body 文档编号列表
 * @returns 各文档的解析进度
 */
export async function batchDocumentStatus(body: BatchDocumentStatusRequest): Promise<ApiResponse<DocumentProgress[]>> {
  return http.post<DocumentProgress[]>('/documents/batch-status', body);
}

/**
 * 获取文档预览链接。
 * @param documentId 文档编号
 * @returns 限时预览地址
 */
export async function previewDocument(documentId: number): Promise<ApiResponse<DocumentLink>> {
  return http.get<DocumentLink>(`/documents/${documentId}/preview`);
}

/**
 * 获取文档下载链接。
 * @param documentId 文档编号
 * @returns 限时下载地址
 */
export async function downloadDocument(documentId: number): Promise<ApiResponse<DocumentLink>> {
  return http.get<DocumentLink>(`/documents/${documentId}/download`);
}

/**
 * 重新提交文档解析任务。解析由 Worker 执行。
 * @param documentId 文档编号
 * @returns 本次解析任务的提交结果
 */
export async function parseDocument(documentId: number): Promise<ApiResponse<ParseDocumentResult>> {
  return http.post<ParseDocumentResult>(`/documents/${documentId}/parse`);
}

/**
 * 停止文档解析任务。
 * @param documentId 文档编号
 * @returns 停止后的解析进度
 */
export async function stopDocument(documentId: number): Promise<ApiResponse<DocumentProgress>> {
  return http.post<DocumentProgress>(`/documents/${documentId}/stop`);
}

/**
 * 把文件直传到预签名地址。
 * 预签名只覆盖 Host。直接传 File 时浏览器会自动加上 Content-Type，对象存储会回 403，因此改用 ArrayBuffer。
 * @param upload 预签名上传信息
 * @param file 待上传文件
 * @returns 无返回值；上传失败时抛出 ApiError
 */
export async function putToStorage(upload: UploadUrlResponse, file: File) {
  const body = await file.arrayBuffer();
  const res = await fetch(upload.uploadUrl, {
    method: upload.method,
    body,
  });
  if (!res.ok) throw new ApiError('文件上传失败');
}
