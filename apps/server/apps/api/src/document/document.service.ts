/**
 * 文档登记、预览、下载、删除，以及开始解析和停止。
 * 开始解析只写 t_document 和 t_outbox，不在 API 进程里解析文件。
 * 知识库或文档不属于当前用户时返回 404。
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  DocumentLink,
  DocumentProgress,
  DocumentView,
  ParseDocumentResult,
  UploadUrlResponse,
} from '@ragflux/shared/document';
import { ResponseService } from '@libs/common';
import {
  contentTypeForExtension,
  DOCUMENT_CANCEL_TTL_SECONDS,
  documentCancelKey,
  fileExtension,
  isSupportedDocument,
} from '@libs/pipeline';
import { RedisService } from '@libs/redis';
import { StorageService } from '@libs/storage';
import { DatasetRepository } from '../dataset/dataset.repository.js';
import type { BatchDocumentStatusDto } from './dto/batch-document-status.dto.js';
import type { CreateUploadUrlDto } from './dto/create-upload-url.dto.js';
import type { RegisterDocumentDto } from './dto/register-document.dto.js';
import type { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DocumentRepository } from './document.repository.js';
import { isUserObjectKey, safeFileName, userDocumentPrefix } from './helper/object-key.js';

const LINK_EXPIRES_SECONDS = 300;

type DocumentRow = {
  id: number;
  datasetId: number;
  name: string;
  r2Key: string;
  fileHash: string;
  sizeBytes: number;
  status: string;
  progress: number;
  parseVersion: number;
  enabled: boolean;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly documents: DocumentRepository,
    private readonly datasets: DatasetRepository,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    private readonly responseService: ResponseService,
  ) {}

  /** 为当前用户签发对象存储上传地址。
   * @param userId 当前用户编号
   * @param body 上传文件信息
   * @returns 上传地址响应
   */
  async createUploadUrl(userId: number, body: CreateUploadUrlDto) {
    if (!isSupportedDocument(body.fileName)) {
      return this.responseService.error('不支持的文件类型');
    }
    const key = `${userDocumentPrefix(userId)}${randomUUID()}/${safeFileName(body.fileName)}`;
    try {
      const token = await this.storage.presignPut(key, body.contentType, LINK_EXPIRES_SECONDS);
      const data: UploadUrlResponse = {
        r2Key: token.key,
        uploadUrl: token.uploadUrl,
        method: token.method,
        headers: token.headers,
        expiresAt: token.expiresAt.toISOString(),
      };
      return this.responseService.success<UploadUrlResponse>(data);
    } catch (error) {
      this.logger.error(`签发上传地址失败 userId=${userId}: ${errorText(error)}`);
      return this.responseService.error('上传地址签发失败');
    }
  }

  /** 列出当前用户知识库中的文档。
   * @param userId 当前用户编号
   * @param datasetId 知识库编号
   * @returns 文档列表响应
   */
  async list(userId: number, datasetId: number) {
    const dataset = await this.datasets.findByUser(userId, datasetId);
    if (!dataset) {
      throw new NotFoundException('知识库不存在');
    }
    const rows = await this.documents.listByDataset(datasetId);
    return this.responseService.success<DocumentView[]>(rows.map(toView));
  }

  /** 登记已上传文件并投递解析任务。
   * @param userId 当前用户编号
   * @param datasetId 知识库编号
   * @param body 文档登记请求体
   * @returns 登记后的文档响应
   */
  async register(userId: number, datasetId: number, body: RegisterDocumentDto) {
    const dataset = await this.datasets.findByUser(userId, datasetId);
    if (!dataset) {
      throw new NotFoundException('知识库不存在');
    }
    if (!isSupportedDocument(body.name) || !isUserObjectKey(userId, body.r2Key)) {
      return this.responseService.error('文件信息不正确');
    }
    // 文件已经在对象存储。这里只登记并投递 Outbox，解析由 Worker 执行。
    const row = await this.documents.create({
      datasetId,
      name: body.name,
      r2Key: body.r2Key,
      fileHash: body.fileHash,
      sizeBytes: body.sizeBytes,
    });
    return this.responseService.success<DocumentView>(toView(row));
  }

  /** 获取当前用户文档详情。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 文档详情响应
   */
  async detail(userId: number, documentId: number) {
    const owned = await this.owned(userId, documentId);
    return this.responseService.success<DocumentView>(toView(owned));
  }

  /** 更新当前用户文档的启用状态。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @param body 更新请求体
   * @returns 更新后的文档响应
   */
  async update(userId: number, documentId: number, body: UpdateDocumentDto) {
    const owned = await this.owned(userId, documentId);
    const row = await this.documents.updateEnabled(owned.id, body.enabled);
    if (!row) {
      throw new NotFoundException('文档不存在');
    }
    return this.responseService.success<DocumentView>(toView(row));
  }

  /** 删除当前用户文档及其对象存储文件。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 删除结果响应
   */
  async remove(userId: number, documentId: number) {
    const owned = await this.owned(userId, documentId);
    const chunks = await this.documents.listChunkImageKeys(documentId);
    try {
      if (owned.r2Key) {
        await this.storage.delete(owned.r2Key);
      }
      for (const chunk of chunks) {
        if (chunk.imageKey && chunk.imageKey !== owned.r2Key) {
          await this.storage.delete(chunk.imageKey);
        }
      }
    } catch (error) {
      this.logger.error(`删除对象失败 documentId=${documentId}: ${errorText(error)}`);
      return this.responseService.error('文件删除失败');
    }
    await this.documents.deleteDocument(documentId);
    return this.responseService.success<null>(null);
  }

  /** 批量返回当前用户文档解析进度。
   * @param userId 当前用户编号
   * @param body 文档编号列表
   * @returns 进度列表响应
   */
  async batchStatus(userId: number, body: BatchDocumentStatusDto) {
    const rows = await this.documents.findMany(body.documentIds);
    const datasetIds = [...new Set(rows.map((row) => row.datasetId))];
    const ownedDatasetIds = new Set<number>();
    for (const datasetId of datasetIds) {
      const dataset = await this.datasets.findByUser(userId, datasetId);
      if (dataset) {
        ownedDatasetIds.add(dataset.id);
      }
    }
    const data: DocumentProgress[] = rows.filter((row) => ownedDatasetIds.has(row.datasetId)).map(toProgress);
    return this.responseService.success<DocumentProgress[]>(data);
  }

  /** 为当前用户文档签发预览地址。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 预览链接响应
   */
  async preview(userId: number, documentId: number) {
    const owned = await this.owned(userId, documentId);
    return this.responseService.success<DocumentLink>(await this.signGet(owned, false));
  }

  /** 为当前用户文档签发下载地址。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 下载链接响应
   */
  async download(userId: number, documentId: number) {
    const owned = await this.owned(userId, documentId);
    return this.responseService.success<DocumentLink>(await this.signGet(owned, true));
  }

  /** 重新提交当前用户文档的解析任务。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 解析任务版本响应
   */
  async parse(userId: number, documentId: number) {
    const owned = await this.owned(userId, documentId);
    const parseVersion = await this.documents.enqueueParse(owned.id, owned.parseVersion);
    if (!parseVersion) {
      return this.responseService.error('文档状态已变化，请重试');
    }
    const data: ParseDocumentResult = { documentId: owned.id, parseVersion, status: 'pending' };
    return this.responseService.success<ParseDocumentResult>(data);
  }

  /** 获取当前用户文档解析进度。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 解析进度响应
   */
  async progress(userId: number, documentId: number) {
    const owned = await this.owned(userId, documentId);
    return this.responseService.success<DocumentProgress>(toProgress(owned));
  }

  /** 停止当前用户文档的活动解析任务。
   * @param userId 当前用户编号
   * @param documentId 文档编号
   * @returns 更新后的解析进度响应
   */
  async stop(userId: number, documentId: number) {
    const owned = await this.owned(userId, documentId);
    if (owned.status === 'cancelling') {
      await this.redis.client.set(
        documentCancelKey(documentId),
        String(owned.parseVersion),
        'EX',
        DOCUMENT_CANCEL_TTL_SECONDS,
      );
      return this.responseService.success<DocumentProgress>(toProgress({ ...owned, status: 'cancelling' }));
    }
    const active = ['pending', 'parsing', 'chunking', 'embedding'];
    if (!active.includes(owned.status)) {
      return this.responseService.error('当前状态无法停止');
    }
    await this.redis.client.set(
      documentCancelKey(documentId),
      String(owned.parseVersion),
      'EX',
      DOCUMENT_CANCEL_TTL_SECONDS,
    );
    const updated = await this.documents.markCancelling(documentId, owned.parseVersion);
    if (!updated) {
      await this.redis.client.del(documentCancelKey(documentId));
      return this.responseService.error('当前状态无法停止');
    }
    return this.responseService.success<DocumentProgress>(toProgress({ ...owned, status: 'cancelling' }));
  }

  private async owned(userId: number, documentId: number): Promise<DocumentRow> {
    const document = await this.documents.findById(documentId);
    if (!document) {
      throw new NotFoundException('文档不存在');
    }
    const dataset = await this.datasets.findByUser(userId, document.datasetId);
    if (!dataset) {
      throw new NotFoundException('文档不存在');
    }
    return document;
  }

  private async signGet(document: DocumentRow, download: boolean): Promise<DocumentLink> {
    if (!document.r2Key) {
      throw new NotFoundException('文件不存在');
    }
    try {
      const url = await this.storage.presignGet(
        document.r2Key,
        download ? document.name : '',
        contentTypeForExtension(fileExtension(document.name)),
        LINK_EXPIRES_SECONDS,
      );
      return { url, expiresAt: new Date(Date.now() + LINK_EXPIRES_SECONDS * 1000).toISOString() };
    } catch (error) {
      this.logger.error(`签发读取地址失败 documentId=${document.id}: ${errorText(error)}`);
      throw new NotFoundException('文件不存在');
    }
  }
}

function toView(row: DocumentRow): DocumentView {
  return {
    id: row.id,
    datasetId: row.datasetId,
    name: row.name,
    r2Key: row.r2Key,
    fileHash: row.fileHash,
    sizeBytes: row.sizeBytes,
    status: row.status,
    progress: row.progress,
    parseVersion: row.parseVersion,
    enabled: row.enabled,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toProgress(
  row: Pick<DocumentRow, 'id' | 'status' | 'progress' | 'parseVersion' | 'lastError'>,
): DocumentProgress {
  return {
    id: row.id,
    status: row.status,
    progress: row.progress,
    parseVersion: row.parseVersion,
    lastError: row.lastError,
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
