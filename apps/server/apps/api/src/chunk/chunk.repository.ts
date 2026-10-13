/**
 * 读写 t_chunk。只更新内容和启停，不重新切分。
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@libs/database';

@Injectable()
export class ChunkRepository {
  constructor(private readonly database: DatabaseService) {}

  /** 查询文档的全部分块。
   * @param documentId 文档编号
   * @returns 按分块顺序排列的分块列表
   */
  listByDocument(documentId: number) {
    return this.database.client.orm.public.Chunk.where((row) => row.documentId.eq(documentId))
      .orderBy((row) => row.chunkIndex.asc())
      .all();
  }

  /** 按分块编号查询分块。
   * @param chunkId 分块编号
   * @returns 分块记录，不存在时返回 null
   */
  findById(chunkId: string) {
    return this.database.client.orm.public.Chunk.where((row) => row.id.eq(chunkId)).first();
  }

  /** 更新分块内容、启用状态或 token 数。
   * @param chunkId 分块编号
   * @param patch 要写入的字段
   * @returns 更新后的分块，不存在时返回 null
   */
  async update(chunkId: string, patch: { content?: string; enabled?: boolean; tokenNum?: number }) {
    const updated = await this.database.client.orm.public.Chunk.where((row) => row.id.eq(chunkId)).update(patch);
    return firstRow(updated);
  }
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
