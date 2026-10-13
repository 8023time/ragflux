import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  DatasetView,
} from '@ragflux/shared/dataset';
import { ResponseService } from '@libs/common';
import { LlmService } from '@libs/llm';
import type { CreateDatasetDto } from './dto/create-dataset.dto.js';
import type { UpdateDatasetDto } from './dto/update-dataset.dto.js';
import { ModelRepository } from '../model/model.repository.js';
import { DatasetRepository, type DatasetPatch } from './dataset.repository.js';

@Injectable()
export class DatasetService {
  constructor(
    private readonly datasetRepository: DatasetRepository,
    private readonly modelRepository: ModelRepository,
    private readonly responseService: ResponseService,
    private readonly llm: LlmService,
  ) {}

  /**
   * 列出当前用户的知识库
   * @param userId 当前用户ID
   * @returns 知识库列表
   */
  async list(userId: number) {
    const datasets = await this.datasetRepository.listByUserId(userId);
    return this.responseService.success<DatasetView[]>(datasets);
  }

  /**
   * 创建知识库，写入当前用户。
   * 模型编号留空，名称写成配置里的默认模型，检索和解析会走这套配置。
   * @param userId 当前用户ID
   * @param body 请求体
   * @returns 创建的知识库
   */
  async create(userId: number, body: CreateDatasetDto) {
    const dataset = await this.datasetRepository.create({
      userId,
      name: body.name,
      description: body.description ?? '',
      chunkStrategy: body.chunkStrategy,
      embedModel: this.llm.embeddingEndpoint().model,
      visionModel: this.llm.visionEndpoint().model,
    });
    return this.responseService.success<DatasetView>(dataset);
  }

  /**
   * 修改名称、描述、解析模板，以及当前用户名下的嵌入模型和视觉模型。
   * @param userId 当前用户ID
   * @param datasetId 知识库ID
   * @param body 请求体
   * @returns 更新后的知识库
   */
  async update(userId: number, datasetId: number, body: UpdateDatasetDto) {
    const patch: DatasetPatch = {};
    if (body.name !== undefined) {
      patch.name = body.name;
    }
    if (body.description !== undefined) {
      patch.description = body.description;
    }
    if (body.chunkStrategy !== undefined) {
      patch.chunkStrategy = body.chunkStrategy;
    }
    if (body.embedModelId !== undefined || body.visionModelId !== undefined) {
      const dataset = await this.datasetRepository.findByUser(userId, datasetId);
      if (!dataset) {
        return this.responseService.error('知识库不存在');
      }
    }
    if (body.embedModelId !== undefined) {
      if (body.embedModelId === null) {
        patch.embedModelId = null;
        if (body.embedModel === undefined) {
          patch.embedModel = '';
        }
      } else {
        const model = await this.modelRepository.findEmbed(userId, body.embedModelId);
        if (!model) {
          throw new NotFoundException('模型不存在');
        }
        patch.embedModelId = model.id;
        if (body.embedModel === undefined) {
          patch.embedModel = model.modelId;
        }
      }
    }
    if (body.embedModel !== undefined) {
      patch.embedModel = body.embedModel;
    }
    if (body.visionModelId !== undefined) {
      if (body.visionModelId === 0) {
        patch.visionModelId = 0;
        if (body.visionModel === undefined) {
          patch.visionModel = '';
        }
      } else {
        const model = await this.modelRepository.findVision(userId, body.visionModelId);
        if (!model) {
          throw new NotFoundException('模型不存在');
        }
        patch.visionModelId = model.id;
        if (body.visionModel === undefined) {
          patch.visionModel = model.modelId;
        }
      }
    }
    if (body.visionModel !== undefined) {
      patch.visionModel = body.visionModel;
    }
    if (Object.keys(patch).length === 0) {
      return this.responseService.error('没有可更新的内容');
    }

    const dataset = await this.datasetRepository.updateByUser(userId, datasetId, patch);
    if (!dataset) {
      return this.responseService.error('知识库不存在');
    }
    return this.responseService.success<DatasetView>(dataset);
  }

  /**
   * 删除当前用户的这一条知识库
   * @param userId 当前用户ID
   * @param datasetId 知识库ID
   * @returns 删除结果
   */
  async remove(userId: number, datasetId: number) {
    const deleted = await this.datasetRepository.deleteByUser(userId, datasetId);
    if (!deleted) {
      return this.responseService.error('知识库不存在');
    }
    return this.responseService.success<null>(null);
  }
}
