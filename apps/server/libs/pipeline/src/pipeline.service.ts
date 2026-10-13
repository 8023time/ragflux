/**
 * 文档图给 Worker 用，问答图和检索给 API 用。
 * 文档向量由 Worker 写入 t_chunk.embedding，API 只计算查询向量并执行近邻检索。
 */
import { Injectable } from '@nestjs/common';
import type { RetrievalHit } from '@ragflux/shared/retrieval';
import { DatabaseService, VectorStoreService } from '@libs/database';
import { LlmService, type ModelEndpoint } from '@libs/llm';
import { RedisService } from '@libs/redis';
import { StorageService } from '@libs/storage';
import type { DocumentParseMessage } from '@libs/queue';
import { runDocumentGraph } from './document-graph.js';
import { runQaGraph, type QaInput } from './qa-graph.js';
import { retrieveChunks } from './retrieve.js';

@Injectable()
export class PipelineService {
  constructor(
    private readonly database: DatabaseService,
    private readonly vectorStore: VectorStoreService,
    private readonly storage: StorageService,
    private readonly llm: LlmService,
    private readonly redis: RedisService,
  ) {}

  /** Worker 消费解析消息后调用。失败写在文档状态上，不向外抛，避免队列反复重投。 */
  async runDocument(message: DocumentParseMessage): Promise<void> {
    await runDocumentGraph(
      {
        database: this.database,
        vectorStore: this.vectorStore,
        storage: this.storage,
        llm: this.llm,
        redis: this.redis,
      },
      message,
    );
  }

  /** 检索测试和问答图共用的召回。 */
  retrieve(datasetId: number, endpoint: ModelEndpoint, query: string, topK: number): Promise<RetrievalHit[]> {
    return retrieveChunks(this.vectorStore, this.llm, datasetId, endpoint, query, topK);
  }

  /** 问答图。onDelta 在生成过程中收到增量文本。 */
  answer(input: QaInput): Promise<{ answer: string; hits: RetrievalHit[] }> {
    return runQaGraph({ vectorStore: this.vectorStore, llm: this.llm }, input);
  }
}
