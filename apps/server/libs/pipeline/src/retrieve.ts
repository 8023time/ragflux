/**
 * 问题向量持久化在 t_chunk.embedding 中，检索由数据库完成余弦距离排序。
 * 使用 modelKey 和维度隔离不同嵌入模型，避免不同模型的向量互相比较。
 */
import type { RetrievalHit } from '@ragflux/shared/retrieval';
import { VectorStoreService } from '@libs/database';
import type { LlmService, ModelEndpoint } from '@libs/llm';
import { modelKey } from './document-graph.js';

export async function retrieveChunks(
  vectorStore: VectorStoreService,
  llm: LlmService,
  datasetId: number,
  endpoint: ModelEndpoint,
  query: string,
  topK: number,
): Promise<RetrievalHit[]> {
  const queryVector = await llm.embedQuery(endpoint, query.slice(0, 2000));
  const vectorHits = await vectorStore.search(datasetId, modelKey(endpoint), queryVector, topK);
  return vectorHits;
}
