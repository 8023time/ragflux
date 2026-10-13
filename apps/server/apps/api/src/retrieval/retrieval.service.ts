/**
 * 检索测试。确认知识库属于当前用户后，关键词召回再重排。
 * 不写 t_message。嵌入模型优先用知识库绑定的用户模型，未绑定时用配置里的默认嵌入模型。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import type { RetrievalHit } from '@ragflux/shared/retrieval';
import { ResponseService } from '@libs/common';
import { LlmService } from '@libs/llm';
import { PipelineService } from '@libs/pipeline';
import { DatasetRepository } from '../dataset/dataset.repository.js';
import { ModelRepository } from '../model/model.repository.js';
import type { RetrievalTestDto } from './dto/retrieval-test.dto.js';

@Injectable()
export class RetrievalService {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly models: ModelRepository,
    private readonly pipeline: PipelineService,
    private readonly responseService: ResponseService,
    private readonly llm: LlmService,
  ) {}

  /** 测试当前用户知识库的检索效果。
   * @param userId 当前用户编号
   * @param body 检索测试请求体
   * @returns 检索命中结果响应
   */
  async test(userId: number, body: RetrievalTestDto) {
    const dataset = await this.datasets.findByUser(userId, body.datasetId);
    if (!dataset) {
      throw new NotFoundException('知识库不存在');
    }
    const endpoint = dataset.embedModelId
      ? await this.userEmbedEndpoint(userId, dataset.embedModelId)
      : this.llm.embeddingEndpoint();
    if (!endpoint) {
      return this.responseService.error('请先为知识库绑定嵌入模型');
    }
    try {
      const hits = await this.pipeline.retrieve(dataset.id, endpoint, body.query, body.topK ?? 5);
      return this.responseService.success<RetrievalHit[]>(hits);
    } catch (error) {
      return this.responseService.error(error instanceof Error ? error.message : '嵌入模型调用失败');
    }
  }

  private async userEmbedEndpoint(userId: number, embedModelId: number) {
    const model = await this.models.findEmbed(userId, embedModelId);
    if (!model || !model.apiKey) {
      return null;
    }
    return { baseUrl: model.apiUrl, apiKey: model.apiKey, model: model.modelId };
  }
}
