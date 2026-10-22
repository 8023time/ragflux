import type { CreateDatasetRequest, DatasetView, UpdateDatasetRequest } from '@ragflux/shared/dataset';
import type { ApiResponse } from '@ragflux/shared/common';
import { http } from '@/common/utils/api-request';

export type DatasetRow = DatasetView & { documentCount?: number };

/**
 * 列出当前用户的知识库。
 * @returns 知识库列表
 */
export async function listDatasets(): Promise<ApiResponse<DatasetView[]>> {
  return http.get<DatasetView[]>('/datasets');
}

/**
 * 创建知识库。
 * @param body 名称、描述与切分策略
 * @returns 新建的知识库
 */
export async function createDataset(body: CreateDatasetRequest): Promise<ApiResponse<DatasetView>> {
  return http.post<DatasetView>('/datasets', body);
}

/**
 * 修改知识库配置。模型编号必须属于当前用户。
 * @param datasetId 知识库编号
 * @param body 待更新的配置
 * @returns 更新后的知识库
 */
export async function updateDataset(datasetId: number, body: UpdateDatasetRequest): Promise<ApiResponse<DatasetView>> {
  return http.put<DatasetView>(`/datasets/${datasetId}`, body);
}

/**
 * 删除知识库。
 * @param datasetId 知识库编号
 * @returns 统一响应，成功时 data 为 null
 */
export async function deleteDataset(datasetId: number): Promise<ApiResponse<null>> {
  return http.delete<null>(`/datasets/${datasetId}`);
}
