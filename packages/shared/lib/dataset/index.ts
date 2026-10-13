/** 创建知识库。 */
export interface CreateDatasetRequest {
  name: string;
  description?: string;
  chunkStrategy?: string;
}

/** 修改知识库配置。模型编号必须属于当前用户。 */
export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
  chunkStrategy?: string;
  embedModelId?: number | null;
  embedModel?: string;
  visionModelId?: number;
  visionModel?: string;
}

/** 知识库列表及写入接口返回的视图。 */
export interface DatasetView {
  id: number;
  userId: number;
  name: string;
  description: string;
  chunkStrategy: string;
  embedModel: string;
  embedModelId: number | null;
  visionModel: string;
  visionModelId: number;
  createdAt: string;
  updatedAt: string;
  documentCount?: number;
  chunkCount?: number;
}
