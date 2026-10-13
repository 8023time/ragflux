/**
 * 查看和修改分块。分块必须属于当前用户的知识库，否则 404。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChunkView } from '@ragflux/shared/chunk';
import { ResponseService } from '@libs/common';
import { estimateTokens } from '@libs/pipeline';
import { DatasetRepository } from '../dataset/dataset.repository.js';
import { DocumentRepository } from '../document/document.repository.js';
import type { UpdateChunkDto } from './dto/update-chunk.dto.js';
import { ChunkRepository } from './chunk.repository.js';

type ChunkRow = {
  id: string;
  documentId: number;
  datasetId: number;
  chunkIndex: number;
  content: string;
  tokenNum: number;
  imageKey: string;
  elementType: string;
  pageNumber: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ChunkService {
  constructor(
    private readonly chunks: ChunkRepository,
    private readonly documents: DocumentRepository,
    private readonly datasets: DatasetRepository,
    private readonly responseService: ResponseService,
  ) {}

  /** 列出当前用户文档的分块。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 分块列表响应
   */
  async list(userId: number, documentId: number) {
    await this.ownDocument(userId, documentId, '文档不存在');
    const rows = await this.chunks.listByDocument(documentId);
    return this.responseService.success<ChunkView[]>(rows.map(toView));
  }

  /** 更新当前用户分块的内容或启用状态。
   * @param userId 当前用户编号
   * @param chunkId 分块编号
   * @param body 更新请求体
   * @returns 更新后的分块响应
   */
  async update(userId: number, chunkId: string, body: UpdateChunkDto) {
    if (body.content === undefined && body.enabled === undefined) {
      return this.responseService.error('没有可更新的内容');
    }
    const chunk = await this.chunks.findById(chunkId);
    if (!chunk) {
      throw new NotFoundException('分块不存在');
    }
    await this.ownDocument(userId, chunk.documentId, '分块不存在');
    const patch: { content?: string; enabled?: boolean; tokenNum?: number } = {};
    if (body.content !== undefined) {
      patch.content = body.content;
      patch.tokenNum = estimateTokens(body.content);
    }
    if (body.enabled !== undefined) {
      patch.enabled = body.enabled;
    }
    const updated = await this.chunks.update(chunkId, patch);
    if (!updated) {
      throw new NotFoundException('分块不存在');
    }
    return this.responseService.success<ChunkView>(toView(updated));
  }

  private async ownDocument(userId: number, documentId: number, message: string) {
    const document = await this.documents.findById(documentId);
    if (!document) {
      throw new NotFoundException(message);
    }
    const dataset = await this.datasets.findByUser(userId, document.datasetId);
    if (!dataset) {
      throw new NotFoundException(message);
    }
  }
}

function toView(row: ChunkRow): ChunkView {
  return {
    id: row.id,
    documentId: row.documentId,
    datasetId: row.datasetId,
    chunkIndex: row.chunkIndex,
    content: row.content,
    tokenNum: row.tokenNum,
    imageKey: row.imageKey,
    elementType: row.elementType,
    pageNumber: row.pageNumber,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
