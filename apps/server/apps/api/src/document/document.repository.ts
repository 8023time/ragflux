/**
 * 读写 t_document。登记和开始解析都在同一事务写入 t_outbox。
 * 删除时先删该文档的 t_chunk，再删文档。对象存储由 Service 处理。
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@libs/database';
import { DOCUMENT_PARSE_TOPIC } from '@libs/queue';

const ACTIVE_STATUSES = ['pending', 'parsing', 'chunking', 'embedding'];

@Injectable()
export class DocumentRepository {
  constructor(private readonly database: DatabaseService) {}

  /** 查询知识库下的文档。
   * @param datasetId 知识库编号
   * @returns 文档列表
   */
  listByDataset(datasetId: number) {
    return this.database.client.orm.public.Document.where((row) => row.datasetId.eq(datasetId))
      .orderBy((row) => row.id.desc())
      .all();
  }

  /** 按编号查询文档。
   * @param documentId 文档编号
   * @returns 文档记录，不存在时返回 null
   */
  findById(documentId: number) {
    return this.database.client.orm.public.Document.where((row) => row.id.eq(documentId)).first();
  }

  /** 批量查询文档。
   * @param documentIds 文档编号列表
   * @returns 文档列表
   */
  findMany(documentIds: number[]) {
    return this.database.client.orm.public.Document.where((row) => row.id.in(documentIds)).all();
  }

  /**
   * 登记时把解析任务一并写入 Outbox。
   * 只插入文档会停在 pending，进度接口一直返回 0，Worker 也收不到消息。
   */
  /** 创建文档并在同一事务中写入解析 Outbox 消息。
   * @param data 文档登记数据
   * @returns 新建的文档记录
   */
  create(data: { datasetId: number; name: string; r2Key: string; fileHash: string; sizeBytes: number }) {
    const parseVersion = 1;
    return this.database.client.transaction(async (tx) => {
      const row = await tx.orm.public.Document.create({
        datasetId: data.datasetId,
        name: data.name,
        r2Key: data.r2Key,
        fileHash: data.fileHash,
        sizeBytes: data.sizeBytes,
        status: 'pending',
        progress: 0,
        parseVersion,
      });
      await tx.orm.public.Outbox.create({
        topic: DOCUMENT_PARSE_TOPIC,
        aggregateId: row.id,
        payload: { documentId: row.id, parseVersion },
      });
      return row;
    });
  }

  /** 更新文档启用状态。
   * @param documentId 文档编号
   * @param enabled 是否启用
   * @returns 更新后的文档，不存在时返回 null
   */
  async updateEnabled(documentId: number, enabled: boolean) {
    const updated = await this.database.client.orm.public.Document.where((row) => row.id.eq(documentId)).update({
      enabled,
    });
    return firstRow(updated);
  }

  /**
   * 版本号加一后改为 pending，并插入 Outbox。
   * 用当前版本做条件，避免两次点击覆盖同一次解析。
   */
  /** 递增解析版本并写入解析 Outbox 消息。
   * @param documentId 文档编号
   * @param currentVersion 当前解析版本
   * @returns 新解析版本，状态变化时返回 null
   */
  async enqueueParse(documentId: number, currentVersion: number): Promise<number | null> {
    const nextVersion = currentVersion + 1;
    return this.database.client.transaction(async (tx) => {
      const updated = await tx.orm.public.Document.where((row) => row.id.eq(documentId))
        .where((row) => row.parseVersion.eq(currentVersion))
        .update({
          status: 'pending',
          progress: 0,
          parseVersion: nextVersion,
          attemptCount: 0,
          lastError: null,
          parseError: null,
        });
      if (!firstRow(updated)) {
        return null;
      }
      await tx.orm.public.Outbox.create({
        topic: DOCUMENT_PARSE_TOPIC,
        aggregateId: documentId,
        payload: { documentId, parseVersion: nextVersion },
      });
      return nextVersion;
    });
  }

  /** 将指定版本的活动解析任务标记为取消中。
   * @param documentId 文档编号
   * @param parseVersion 解析版本
   * @returns 是否成功更新
   */
  async markCancelling(documentId: number, parseVersion: number) {
    const updated = await this.database.client.orm.public.Document.where((row) => row.id.eq(documentId))
      .where((row) => row.parseVersion.eq(parseVersion))
      .where((row) => row.status.in(ACTIVE_STATUSES))
      .update({ status: 'cancelling' });
    return firstRow(updated) != null;
  }

  /** 查询文档分块产生的对象存储图片键。
   * @param documentId 文档编号
   * @returns 图片键列表
   */
  listChunkImageKeys(documentId: number) {
    return this.database.client.orm.public.Chunk.where((row) => row.documentId.eq(documentId))
      .select('imageKey')
      .all();
  }

  /** 在事务中删除文档及其分块。
   * @param documentId 文档编号
   * @returns 删除完成的 Promise
   */
  async deleteDocument(documentId: number) {
    await this.database.client.transaction(async (tx) => {
      await tx.orm.public.Chunk.where((row) => row.documentId.eq(documentId)).delete();
      await tx.orm.public.Document.where((row) => row.id.eq(documentId)).delete();
    });
  }
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
