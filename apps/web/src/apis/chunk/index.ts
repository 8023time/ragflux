import type { ChunkView, UpdateChunkRequest } from '@ragflux/shared/chunk';
import type { ApiResponse } from '@ragflux/shared/common';
import { http } from '@/common/utils/api-request';

/**
 * 列出文档的全部分块。
 * @param documentId 文档编号
 * @returns 分块列表
 */
export async function listChunks(documentId: number): Promise<ApiResponse<ChunkView[]>> {
  return http.get<ChunkView[]>(`/documents/${documentId}/chunks`);
}

/**
 * 修改分块内容或启用状态，不会重新切分文档。
 * @param chunkId 分块编号
 * @param body 待更新的内容或启用状态
 * @returns 更新后的分块
 */
export async function updateChunk(chunkId: string, body: UpdateChunkRequest): Promise<ApiResponse<ChunkView>> {
  return http.put<ChunkView>(`/chunks/${encodeURIComponent(chunkId)}`, body);
}
