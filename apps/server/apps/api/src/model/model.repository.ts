/**
 * 读写 t_embed_model、t_vision_model。查询和删除都带 userId。
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@libs/database';

export type ModelPatch = {
  name?: string;
  modelId?: string;
  apiUrl?: string;
  apiKey?: string;
};

export type ModelInput = {
  userId: number;
  name: string;
  modelId: string;
  apiUrl: string;
  apiKey: string;
};

@Injectable()
export class ModelRepository {
  constructor(private readonly database: DatabaseService) {}

  /** 查询当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @returns 嵌入模型列表
   */
  listEmbed(userId: number) {
    return this.database.client.orm.public.EmbedModel.where((row) => row.userId.eq(userId))
      .orderBy((row) => row.id.desc())
      .all();
  }

  /** 查询当前用户的视觉模型。
   * @param userId 当前用户编号
   * @returns 视觉模型列表
   */
  listVision(userId: number) {
    return this.database.client.orm.public.VisionModel.where((row) => row.userId.eq(userId))
      .orderBy((row) => row.id.desc())
      .all();
  }

  /** 查询当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @returns 模型记录，不存在时返回 null
   */
  findEmbed(userId: number, id: number) {
    return this.database.client.orm.public.EmbedModel.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(id))
      .first();
  }

  /** 查询当前用户的视觉模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @returns 模型记录，不存在时返回 null
   */
  findVision(userId: number, id: number) {
    return this.database.client.orm.public.VisionModel.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(id))
      .first();
  }

  /** 创建嵌入模型记录。
   * @param data 模型数据
   * @returns 新建的模型记录
   */
  createEmbed(data: ModelInput) {
    return this.database.client.orm.public.EmbedModel.create(data);
  }

  /** 创建视觉模型记录。
   * @param data 模型数据
   * @returns 新建的模型记录
   */
  createVision(data: ModelInput) {
    return this.database.client.orm.public.VisionModel.create(data);
  }

  /** 更新当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @param patch 要更新的字段
   * @returns 更新后的模型，不存在时返回 null
   */
  async updateEmbed(userId: number, id: number, patch: ModelPatch) {
    const updated = await this.database.client.orm.public.EmbedModel.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(id))
      .update(patch);
    return firstRow(updated);
  }

  /** 更新当前用户的视觉模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @param patch 要更新的字段
   * @returns 更新后的模型，不存在时返回 null
   */
  async updateVision(userId: number, id: number, patch: ModelPatch) {
    const updated = await this.database.client.orm.public.VisionModel.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(id))
      .update(patch);
    return firstRow(updated);
  }

  /** 删除当前用户的嵌入模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @returns 是否成功删除
   */
  async deleteEmbed(userId: number, id: number) {
    const existing = await this.findEmbed(userId, id);
    if (!existing) {
      return false;
    }
    await this.database.client.orm.public.EmbedModel.where((row) => row.id.eq(existing.id)).delete();
    return true;
  }

  /** 删除当前用户的视觉模型。
   * @param userId 当前用户编号
   * @param id 模型编号
   * @returns 是否成功删除
   */
  async deleteVision(userId: number, id: number) {
    const existing = await this.findVision(userId, id);
    if (!existing) {
      return false;
    }
    await this.database.client.orm.public.VisionModel.where((row) => row.id.eq(existing.id)).delete();
    return true;
  }
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
