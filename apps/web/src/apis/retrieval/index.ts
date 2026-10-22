import type { ApiResponse } from '@ragflux/shared/common';
import type { RetrievalHit, RetrievalTestRequest } from '@ragflux/shared/retrieval';
import { http } from '@/common/utils/api-request';

/**
 * 对知识库执行一次检索测试。
 * @param body 知识库、查询文本与可选返回条数
 * @returns 命中的分块
 */
export async function retrievalTest(body: RetrievalTestRequest): Promise<ApiResponse<RetrievalHit[]>> {
  return http.post<RetrievalHit[]>('/retrieval/test', body);
}
