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
} from "@ragflux/shared/document";
import { ApiError, apiJSON } from "@/lib/http";

export function createUploadUrl(body: CreateUploadUrlRequest) {
  return apiJSON<UploadUrlResponse>("/documents/upload-url", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listDocuments(datasetId: number) {
  return apiJSON<DocumentView[]>(`/datasets/${datasetId}/documents`);
}

export function registerDocument(
  datasetId: number,
  body: RegisterDocumentRequest,
) {
  return apiJSON<DocumentView>(`/datasets/${datasetId}/documents`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getDocument(documentId: number) {
  return apiJSON<DocumentView>(`/documents/${documentId}`);
}

export function updateDocument(
  documentId: number,
  body: UpdateDocumentRequest,
) {
  return apiJSON<DocumentView>(`/documents/${documentId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteDocument(documentId: number) {
  return apiJSON<null>(`/documents/${documentId}`, { method: "DELETE" });
}

export function batchDocumentStatus(body: BatchDocumentStatusRequest) {
  return apiJSON<DocumentProgress[]>("/documents/batch-status", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function previewDocument(documentId: number) {
  return apiJSON<DocumentLink>(`/documents/${documentId}/preview`);
}

export function downloadDocument(documentId: number) {
  return apiJSON<DocumentLink>(`/documents/${documentId}/download`);
}

export function parseDocument(documentId: number) {
  return apiJSON<ParseDocumentResult>(`/documents/${documentId}/parse`, {
    method: "POST",
  });
}

export function stopDocument(documentId: number) {
  return apiJSON<DocumentProgress>(`/documents/${documentId}/stop`, {
    method: "POST",
  });
}

export async function putToStorage(upload: UploadUrlResponse, file: File) {
  // 预签名只覆盖 Host。直接传 File 时浏览器会自动加上 Content-Type，R2 会回 403。
  const body = await file.arrayBuffer();
  const res = await fetch(upload.uploadUrl, {
    method: upload.method,
    body,
  });
  if (!res.ok) throw new ApiError("文件上传失败");
}
