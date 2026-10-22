import type { ApiResponse } from '@ragflux/shared/common';
import type {
  CreateModelRequest,
  DefaultModels,
  ModelView,
  TestModelRequest,
  TestModelResult,
} from '@ragflux/shared/model';
import { http } from '@/common/utils/api-request';

/**
 * 获取服务端配置的默认嵌入模型与视觉模型。
 * @returns 默认模型标识
 */
export async function listDefaultModels(): Promise<ApiResponse<DefaultModels>> {
  return http.get<DefaultModels>('/models/defaults');
}

/**
 * 列出当前用户的嵌入模型。
 * @returns 嵌入模型列表，不含完整密钥
 */
export async function listEmbedModels(): Promise<ApiResponse<ModelView[]>> {
  return http.get<ModelView[]>('/embed-models');
}

/**
 * 创建嵌入模型。
 * @param body 名称、模型标识、接口地址与可选密钥
 * @returns 新建的嵌入模型
 */
export async function createEmbedModel(body: CreateModelRequest): Promise<ApiResponse<ModelView>> {
  return http.post<ModelView>('/embed-models', body);
}

/**
 * 删除嵌入模型。
 * @param id 模型编号
 * @returns 统一响应，成功时 data 为 null
 */
export async function deleteEmbedModel(id: number): Promise<ApiResponse<null>> {
  return http.delete<null>(`/embed-models/${id}`);
}

/**
 * 列出当前用户的视觉模型。
 * @returns 视觉模型列表，不含完整密钥
 */
export async function listVisionModels(): Promise<ApiResponse<ModelView[]>> {
  return http.get<ModelView[]>('/vision-models');
}

/**
 * 创建视觉模型。
 * @param body 名称、模型标识、接口地址与可选密钥
 * @returns 新建的视觉模型
 */
export async function createVisionModel(body: CreateModelRequest): Promise<ApiResponse<ModelView>> {
  return http.post<ModelView>('/vision-models', body);
}

/**
 * 删除视觉模型。
 * @param id 模型编号
 * @returns 统一响应，成功时 data 为 null
 */
export async function deleteVisionModel(id: number): Promise<ApiResponse<null>> {
  return http.delete<null>(`/vision-models/${id}`);
}

/**
 * 使用未保存的连接信息测试嵌入模型连通性。
 * @param body 模型标识、接口地址与密钥
 * @returns 连通性测试结果
 */
export async function testEmbedModel(body: TestModelRequest): Promise<ApiResponse<TestModelResult>> {
  return http.post<TestModelResult>('/models/test-embed', body);
}

/**
 * 使用未保存的连接信息测试视觉模型连通性。
 * @param body 模型标识、接口地址与密钥
 * @returns 连通性测试结果
 */
export async function testVisionModel(body: TestModelRequest): Promise<ApiResponse<TestModelResult>> {
  return http.post<TestModelResult>('/models/test-vision', body);
}
