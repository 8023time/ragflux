import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@libs/database';

export type DatasetPatch = {
  name?: string;
  description?: string;
  chunkStrategy?: string;
  embedModel?: string;
  embedModelId?: number | null;
  visionModel?: string;
  visionModelId?: number;
};

@Injectable()
export class DatasetRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /** 查询当前用户的知识库。
   * @param userId 当前用户编号
   * @param datasetId 知识库编号
   * @returns 知识库记录，不存在时返回 null
   */
  findByUser(userId: number, datasetId: number) {
    return this.databaseService.client.orm.public.Dataset.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(datasetId))
      .first();
  }

  /** 列出当前用户的知识库。
   * @param userId 当前用户编号
   * @returns 知识库列表
   */
  listByUserId(userId: number) {
    return this.databaseService.client.orm.public.Dataset.where((row) => row.userId.eq(userId))
      .orderBy((row) => row.id.desc())
      .all();
  }

  /** 创建知识库记录。
   * @param data 知识库数据
   * @returns 新建的知识库记录
   */
  create(data: {
    userId: number;
    name: string;
    description: string;
    chunkStrategy?: string;
    embedModel?: string;
    visionModel?: string;
  }) {
    return this.databaseService.client.orm.public.Dataset.create({
      userId: data.userId,
      name: data.name,
      description: data.description,
      ...(data.chunkStrategy !== undefined ? { chunkStrategy: data.chunkStrategy } : {}),
      ...(data.embedModel !== undefined ? { embedModel: data.embedModel } : {}),
      ...(data.visionModel !== undefined ? { visionModel: data.visionModel } : {}),
    });
  }

  /** 更新当前用户的知识库。
   * @param userId 当前用户编号
   * @param datasetId 知识库编号
   * @param patch 要更新的字段
   * @returns 更新后的记录，不存在时返回 null
   */
  async updateByUser(userId: number, datasetId: number, patch: DatasetPatch) {
    const updated = await this.databaseService.client.orm.public.Dataset.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(datasetId))
      .update(patch);
    if (Array.isArray(updated)) {
      return updated[0] ?? null;
    }
    return updated ?? null;
  }

  /** 删除当前用户的知识库。
   * @param userId 当前用户编号
   * @param datasetId 知识库编号
   * @returns 是否成功删除
   */
  async deleteByUser(userId: number, datasetId: number) {
    const existing = await this.databaseService.client.orm.public.Dataset.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(datasetId))
      .first();
    if (!existing) {
      return false;
    }
    await this.databaseService.client.orm.public.Dataset.where((row) => row.id.eq(existing.id)).delete();
    return true;
  }
}
