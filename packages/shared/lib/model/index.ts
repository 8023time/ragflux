/** 创建嵌入模型或视觉模型。 */
export interface CreateModelRequest {
  name: string;
  modelId: string;
  apiUrl: string;
  apiKey?: string;
}

/** 修改模型。未传入的字段保持原值。 */
export interface UpdateModelRequest {
  name?: string;
  modelId?: string;
  apiUrl?: string;
  apiKey?: string;
}

/** 使用未保存的连接信息执行一次最小模型请求。 */
export interface TestModelRequest {
  modelId: string;
  apiUrl: string;
  apiKey: string;
}

/** 模型视图，不包含完整 API 密钥。 */
export interface ModelView {
  id: number;
  name: string;
  modelId: string;
  apiUrl: string;
  apiKeyHint: string;
  createdAt: string;
  updatedAt: string;
}

/** 模型连通性测试结果。 */
export interface TestModelResult {
  ok: true;
}

/** 服务端配置中的默认嵌入模型和视觉模型，只包含模型标识。 */
export interface DefaultModels {
  embed: {
    modelId: string;
  };
  vision: {
    modelId: string;
  };
}
