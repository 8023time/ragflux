/**
 * 嵌入模型和视觉模型的登记与连通性测试。
 * 列表和写入结果只返回密钥提示。测试请求不落库。
 * 别人的模型和不存在的模型都是 404。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import type { DefaultModels, ModelView, TestModelResult } from '@ragflux/shared/model';
import { ResponseService } from '@libs/common';
import { LlmService } from '@libs/llm';
import type { CreateEmbedModelDto } from './dto/create-embed-model.dto.js';
import type { CreateVisionModelDto } from './dto/create-vision-model.dto.js';
import type { TestEmbedModelDto } from './dto/test-embed-model.dto.js';
import type { TestVisionModelDto } from './dto/test-vision-model.dto.js';
import type { UpdateEmbedModelDto } from './dto/update-embed-model.dto.js';
import type { UpdateVisionModelDto } from './dto/update-vision-model.dto.js';
import { ModelRepository, type ModelPatch } from './model.repository.js';

type ModelRow = {
  id: number;
  name: string;
  modelId: string;
  apiUrl: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ModelService {
  constructor(
    private readonly repository: ModelRepository,
    private readonly responseService: ResponseService,
    private readonly llm: LlmService,
  ) {}

  /** 列出当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @returns 脱敏后的模型列表响应
   */
  async listEmbed(userId: number) {
    const rows = await this.repository.listEmbed(userId);
    return this.responseService.success<ModelView[]>(rows.map(toView));
  }

  /** 列出当前用户的视觉模型。
   * @param userId 当前用户编号
   * @returns 脱敏后的模型列表响应
   */
  async listVision(userId: number) {
    const rows = await this.repository.listVision(userId);
    return this.responseService.success<ModelView[]>(rows.map(toView));
  }

  /** 配置里的默认模型。只返回模型标识，地址和密钥留在服务端。 */
  /** 返回服务端配置的默认模型标识。
   * @returns 默认模型响应
   */
  defaults() {
    const data: DefaultModels = {
      embed: { modelId: this.llm.embeddingEndpoint().model },
      vision: { modelId: this.llm.visionEndpoint().model },
    };
    return this.responseService.success<DefaultModels>(data);
  }

  /** 创建当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @param body 模型请求体
   * @returns 脱敏后的模型响应
   */
  async createEmbed(userId: number, body: CreateEmbedModelDto) {
    const row = await this.repository.createEmbed({
      userId,
      name: body.name,
      modelId: body.modelId,
      apiUrl: body.apiUrl,
      apiKey: body.apiKey ?? '',
    });
    return this.responseService.success<ModelView>(toView(row));
  }

  /** 创建当前用户的视觉模型。
   * @param userId 当前用户编号
   * @param body 模型请求体
   * @returns 脱敏后的模型响应
   */
  async createVision(userId: number, body: CreateVisionModelDto) {
    const row = await this.repository.createVision({
      userId,
      name: body.name,
      modelId: body.modelId,
      apiUrl: body.apiUrl,
      apiKey: body.apiKey ?? '',
    });
    return this.responseService.success<ModelView>(toView(row));
  }

  /** 更新当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @param body 更新请求体
   * @returns 更新后的模型响应
   */
  async updateEmbed(userId: number, id: number, body: UpdateEmbedModelDto) {
    const patch = toPatch(body);
    if (!patch) {
      return this.responseService.error('没有可更新的内容');
    }
    const row = await this.repository.updateEmbed(userId, id, patch);
    if (!row) {
      throw new NotFoundException('模型不存在');
    }
    return this.responseService.success<ModelView>(toView(row));
  }

  /** 更新当前用户的视觉模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @param body 更新请求体
   * @returns 更新后的模型响应
   */
  async updateVision(userId: number, id: number, body: UpdateVisionModelDto) {
    const patch = toPatch(body);
    if (!patch) {
      return this.responseService.error('没有可更新的内容');
    }
    const row = await this.repository.updateVision(userId, id, patch);
    if (!row) {
      throw new NotFoundException('模型不存在');
    }
    return this.responseService.success<ModelView>(toView(row));
  }

  /** 删除当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @returns 删除结果响应
   */
  async removeEmbed(userId: number, id: number) {
    const deleted = await this.repository.deleteEmbed(userId, id);
    if (!deleted) {
      throw new NotFoundException('模型不存在');
    }
    return this.responseService.success<null>(null);
  }

  /** 删除当前用户的视觉模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @returns 删除结果响应
   */
  async removeVision(userId: number, id: number) {
    const deleted = await this.repository.deleteVision(userId, id);
    if (!deleted) {
      throw new NotFoundException('模型不存在');
    }
    return this.responseService.success<null>(null);
  }

  /** 用调用方临时给出的地址发一次嵌入，不写表。
   * @param body 嵌入模型连接信息
   * @returns 连通性测试响应
   */
  async testEmbed(body: TestEmbedModelDto) {
    try {
      await this.llm.testEmbedding({ baseUrl: body.apiUrl, apiKey: body.apiKey, model: body.modelId });
    } catch (error) {
      return this.responseService.error(error instanceof Error ? error.message : '嵌入模型调用失败');
    }
    const data: TestModelResult = { ok: true };
    return this.responseService.success<TestModelResult>(data);
  }

  /** 用一张最小图片发一次视觉对话，不写表。
   * @param body 视觉模型连接信息
   * @returns 连通性测试响应
   */
  async testVision(body: TestVisionModelDto) {
    try {
      await this.llm.testVision({ baseUrl: body.apiUrl, apiKey: body.apiKey, model: body.modelId });
    } catch (error) {
      return this.responseService.error(error instanceof Error ? error.message : '视觉模型调用失败');
    }
    const data: TestModelResult = { ok: true };
    return this.responseService.success<TestModelResult>(data);
  }
}

function toPatch(body: UpdateEmbedModelDto | UpdateVisionModelDto): ModelPatch | null {
  const patch: ModelPatch = {};
  if (body.name !== undefined) {
    patch.name = body.name;
  }
  if (body.modelId !== undefined) {
    patch.modelId = body.modelId;
  }
  if (body.apiUrl !== undefined) {
    patch.apiUrl = body.apiUrl;
  }
  if (body.apiKey !== undefined) {
    patch.apiKey = body.apiKey;
  }
  return Object.keys(patch).length === 0 ? null : patch;
}

function toView(row: ModelRow): ModelView {
  return {
    id: row.id,
    name: row.name,
    modelId: row.modelId,
    apiUrl: row.apiUrl,
    apiKeyHint: hint(row.apiKey),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function hint(apiKey: string): string {
  if (!apiKey) {
    return '';
  }
  if (apiKey.length <= 4) {
    return '****';
  }
  return `****${apiKey.slice(-4)}`;
}
