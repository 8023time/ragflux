/**
 * 文档图由 Worker 调用。状态写在 t_document.status。
 * 向量不入库。图片块只把视觉模型的描述写入 t_chunk.content。
 * 重复投递靠 parseVersion 丢弃；停止标记在每个节点开始前检查。
 */
import { randomUUID } from 'node:crypto';
import type { DatabaseService, VectorStoreService } from '@libs/database';
import type { LlmService, ModelEndpoint } from '@libs/llm';
import type { RedisService } from '@libs/redis';
import type { StorageService } from '@libs/storage';
import type { DocumentParseMessage } from '@libs/queue';
import { documentCancelKey } from './document-cancel.js';
import { fileExtension, imageMimeType } from './file-kind.js';
import { parseFile, type ParsedBlock } from './parse-file.js';
import { estimateTokens, splitText } from './split-text.js';

const MAX_CHUNKS = 2000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACTIVE_ATTEMPTS = 3;

type DraftChunk = {
  id?: string;
  content: string;
  pageNumber: number;
  elementType: 'text' | 'image';
  imageKey: string;
  vector?: number[];
};

type DocumentDeps = {
  database: DatabaseService;
  vectorStore: VectorStoreService;
  storage: StorageService;
  llm: LlmService;
  redis: RedisService;
};

export async function runDocumentGraph(deps: DocumentDeps, message: DocumentParseMessage): Promise<void> {
  const draft: { blocks: ParsedBlock[]; chunks: DraftChunk[]; file: Buffer | null; r2Key: string } = {
    blocks: [],
    chunks: [],
    file: null,
    r2Key: '',
  };

  try {
    const state = { documentId: message.documentId, parseVersion: message.parseVersion };
    const stop = async (route: string): Promise<boolean> => {
      if (route === 'end') {
        return true;
      }
      if (route === 'cancel') {
        await markCancelled(deps, state.documentId, state.parseVersion);
        return true;
      }
      return false;
    };
    let route = await prepare(deps, state, draft);
    if (await stop(route)) return;
    route = await parseNode(deps, state, draft);
    if (await stop(route)) return;
    route = await splitNode(deps, state, draft);
    if (await stop(route)) return;
    route = await describeNode(deps, state, draft);
    if (await stop(route)) return;
    route = await embedNode(deps, state, draft);
    if (await stop(route)) return;
    route = await persistNode(deps, state, draft);
    if (route === 'cancel') {
      await markCancelled(deps, state.documentId, state.parseVersion);
    }
  } catch (error) {
    await markFailed(deps, message, readableError(error));
  }
}

async function prepare(
  deps: DocumentDeps,
  state: { documentId: number; parseVersion: number },
  _draft: { file: Buffer | null },
): Promise<string> {
  const gate = await boundary(deps, state.documentId, state.parseVersion);
  if (gate !== 'ok') {
    return gate;
  }
  const document = await loadDocument(deps, state.documentId);
  if (!document) {
    return 'end';
  }
  if (document.status === 'done' || document.status === 'cancelled') {
    return 'end';
  }
  // 同一次解析崩溃重试超过上限后停止。用户再次点击解析会把 attemptCount 清零。
  if (document.status !== 'pending' && document.attemptCount >= ACTIVE_ATTEMPTS) {
    if (document.status !== 'failed') {
      await markFailed(deps, { documentId: state.documentId, parseVersion: state.parseVersion }, '解析重试次数已用尽');
    }
    return 'end';
  }
  await patchDocument(deps, state.documentId, state.parseVersion, {
    status: 'parsing',
    progress: 20,
    attemptCount: document.attemptCount + 1,
    lastAttemptAt: new Date().toISOString(),
  });
  return 'parse';
}

async function parseNode(
  deps: DocumentDeps,
  state: { documentId: number; parseVersion: number },
  draft: { blocks: ParsedBlock[]; file: Buffer | null; r2Key: string },
): Promise<string> {
  const gate = await boundary(deps, state.documentId, state.parseVersion);
  if (gate !== 'ok') {
    return gate;
  }
  const loaded = await loadOwned(deps, state.documentId);
  if (!loaded) {
    return 'end';
  }
  if (!loaded.document.r2Key) {
    throw new Error('文件不存在');
  }
  const file = await deps.storage.get(loaded.document.r2Key);
  draft.file = file;
  draft.r2Key = loaded.document.r2Key;
  draft.blocks = await parseFile(loaded.document.name, file);
  const hasContent = draft.blocks.some((block) => block.elementType === 'image' || block.text.trim());
  if (!hasContent) {
    throw new Error('没有解析出内容');
  }
  return 'split';
}

async function splitNode(
  deps: DocumentDeps,
  state: { documentId: number; parseVersion: number },
  draft: { blocks: ParsedBlock[]; chunks: DraftChunk[]; r2Key: string },
): Promise<string> {
  const gate = await boundary(deps, state.documentId, state.parseVersion);
  if (gate !== 'ok') {
    return gate;
  }
  const loaded = await loadOwned(deps, state.documentId);
  if (!loaded) {
    return 'end';
  }
  await patchDocument(deps, state.documentId, state.parseVersion, { status: 'chunking', progress: 50 });
  const chunks: DraftChunk[] = [];
  for (const block of draft.blocks) {
    if (block.elementType === 'image') {
      chunks.push({ content: '', pageNumber: block.pageNumber, elementType: 'image', imageKey: draft.r2Key });
      continue;
    }
    const parts = await splitText(loaded.dataset.chunkStrategy, block.text);
    for (const part of parts) {
      chunks.push({ content: part, pageNumber: block.pageNumber, elementType: 'text', imageKey: '' });
    }
  }
  if (chunks.length === 0) {
    throw new Error('没有解析出内容');
  }
  if (chunks.length > MAX_CHUNKS) {
    throw new Error('分块数量过多');
  }
  draft.chunks = chunks;
  return 'describe';
}

async function describeNode(
  deps: DocumentDeps,
  state: { documentId: number; parseVersion: number },
  draft: { chunks: DraftChunk[]; file: Buffer | null },
): Promise<string> {
  const gate = await boundary(deps, state.documentId, state.parseVersion);
  if (gate !== 'ok') {
    return gate;
  }
  await patchDocument(deps, state.documentId, state.parseVersion, { status: 'embedding', progress: 75 });
  const images = draft.chunks.filter((chunk) => chunk.elementType === 'image');
  if (images.length === 0) {
    return 'persist';
  }
  const loaded = await loadOwned(deps, state.documentId);
  if (!loaded) {
    return 'end';
  }
  const endpoint = await visionEndpoint(deps, loaded.dataset);
  if (!draft.file || draft.file.length > MAX_IMAGE_BYTES) {
    throw new Error(draft.file ? '图片过大' : '文件不存在');
  }
  const description = await deps.llm.describeImage(
    endpoint,
    draft.file,
    imageMimeType(fileExtension(loaded.document.name)),
  );
  for (const chunk of images) {
    chunk.content = description;
  }
  return 'persist';
}

async function embedNode(
  deps: DocumentDeps,
  state: { documentId: number; parseVersion: number },
  draft: { chunks: DraftChunk[] },
): Promise<string> {
  const gate = await boundary(deps, state.documentId, state.parseVersion);
  if (gate !== 'ok') return gate;
  const loaded = await loadOwned(deps, state.documentId);
  if (!loaded) return 'end';
  const endpoint = await embeddingEndpoint(deps, loaded.dataset);
  const vectors = await deps.llm.embedDocuments(
    endpoint,
    draft.chunks.map((chunk) => chunk.content.slice(0, 2000)),
  );
  if (vectors.length !== draft.chunks.length || vectors.some((vector) => vector.length === 0)) {
    throw new Error('嵌入模型返回结果不完整');
  }
  for (let index = 0; index < draft.chunks.length; index += 1) {
    draft.chunks[index].vector = vectors[index];
  }
  return 'persist';
}

async function persistNode(
  deps: DocumentDeps,
  state: { documentId: number; parseVersion: number },
  draft: { chunks: DraftChunk[] },
): Promise<string> {
  const gate = await boundary(deps, state.documentId, state.parseVersion);
  if (gate !== 'ok') {
    return gate;
  }
  const loaded = await loadOwned(deps, state.documentId);
  if (!loaded) {
    return 'end';
  }
  const parserName = fileExtension(loaded.document.name);
  await deps.database.client.transaction(async (tx) => {
    const current = await tx.orm.public.Document.where((row) => row.id.eq(state.documentId))
      .where((row) => row.parseVersion.eq(state.parseVersion))
      .first();
    if (!current || current.status === 'cancelling' || current.status === 'cancelled') {
      return;
    }
    await tx.orm.public.Chunk.where((row) => row.documentId.eq(state.documentId)).delete();
    for (let index = 0; index < draft.chunks.length; index += 1) {
      const chunk = draft.chunks[index];
      chunk.id = randomUUID();
      await tx.orm.public.Chunk.create({
        id: chunk.id,
        documentId: state.documentId,
        datasetId: loaded.document.datasetId,
        chunkIndex: index,
        content: chunk.content,
        tokenNum: estimateTokens(chunk.content),
        imageKey: chunk.imageKey,
        elementType: chunk.elementType,
        pageNumber: chunk.pageNumber,
        bbox: {},
        parserName,
        enabled: true,
      });
    }
    await tx.orm.public.Document.where((row) => row.id.eq(state.documentId))
      .where((row) => row.parseVersion.eq(state.parseVersion))
      .update({ status: 'done', progress: 100, lastError: null, parseError: null });
  });
  const endpoint = await embeddingEndpoint(deps, loaded.dataset);
  await deps.vectorStore.replaceEmbeddings(
    draft.chunks.map((chunk) => ({
      chunkId: chunk.id as string,
      datasetId: loaded.document.datasetId,
      modelKey: modelKey(endpoint),
      vector: chunk.vector as number[],
    })),
  );
  const after = await loadDocument(deps, state.documentId);
  if (after && after.parseVersion === state.parseVersion && after.status === 'cancelling') {
    return 'cancel';
  }
  return 'end';
}

async function embeddingEndpoint(
  deps: DocumentDeps,
  dataset: { userId: number; embedModelId: number | null; embedModel: string },
): Promise<ModelEndpoint> {
  if (!dataset.embedModelId) {
    return deps.llm.embeddingEndpoint();
  }
  const model = await deps.database.client.orm.public.EmbedModel.where((row) => row.userId.eq(dataset.userId))
    .where((row) => row.id.eq(dataset.embedModelId))
    .first();
  if (!model || !model.apiKey) {
    throw new Error('知识库未绑定嵌入模型');
  }
  return { baseUrl: model.apiUrl, apiKey: model.apiKey, model: model.modelId };
}

export function modelKey(endpoint: ModelEndpoint): string {
  return `${endpoint.baseUrl.replace(/\/+$/, '')}|${endpoint.model}`;
}

async function visionEndpoint(
  deps: DocumentDeps,
  dataset: { userId: number; visionModelId: number; visionModel: string },
): Promise<ModelEndpoint> {
  if (dataset.visionModelId <= 0) {
    // 名称为空表示明确不使用视觉模型；有名称且没有用户模型编号时，用配置里的默认模型。
    if (!dataset.visionModel) {
      throw new Error('知识库未绑定视觉模型');
    }
    return deps.llm.visionEndpoint();
  }
  const model = await deps.database.client.orm.public.VisionModel.where((row) => row.userId.eq(dataset.userId))
    .where((row) => row.id.eq(dataset.visionModelId))
    .first();
  if (!model || !model.apiKey) {
    throw new Error('知识库未绑定视觉模型');
  }
  return { baseUrl: model.apiUrl, apiKey: model.apiKey, model: model.modelId };
}

async function boundary(
  deps: DocumentDeps,
  documentId: number,
  parseVersion: number,
): Promise<'ok' | 'cancel' | 'end'> {
  const document = await loadDocument(deps, documentId);
  if (!document || document.parseVersion !== parseVersion) {
    return 'end';
  }
  if (document.status === 'cancelled') {
    return 'end';
  }
  if (document.status === 'cancelling') {
    return 'cancel';
  }
  // 标记里是被停止的那一版。新的解析版本不会被旧标记打断。
  const flag = await deps.redis.client.get(documentCancelKey(documentId));
  if (flag && Number(flag) === parseVersion) {
    return 'cancel';
  }
  return 'ok';
}

async function markCancelled(deps: DocumentDeps, documentId: number, parseVersion: number) {
  await patchDocument(deps, documentId, parseVersion, { status: 'cancelled' });
  await deps.redis.client.del(documentCancelKey(documentId));
}

async function markFailed(deps: DocumentDeps, message: DocumentParseMessage, reason: string) {
  const document = await loadDocument(deps, message.documentId);
  if (!document || document.parseVersion !== message.parseVersion) {
    return;
  }
  if (document.status === 'cancelled' || document.status === 'cancelling') {
    await markCancelled(deps, message.documentId, message.parseVersion);
    return;
  }
  if (document.status === 'done') {
    return;
  }
  const text = reason.slice(0, 500);
  await patchDocument(deps, message.documentId, message.parseVersion, {
    status: 'failed',
    lastError: text,
    parseError: text,
  });
}

async function loadDocument(deps: DocumentDeps, documentId: number) {
  return deps.database.client.orm.public.Document.where((row) => row.id.eq(documentId)).first();
}

async function loadOwned(deps: DocumentDeps, documentId: number) {
  const document = await loadDocument(deps, documentId);
  if (!document) {
    return null;
  }
  const dataset = await deps.database.client.orm.public.Dataset.where((row) => row.id.eq(document.datasetId)).first();
  if (!dataset) {
    return null;
  }
  return { document, dataset };
}

async function patchDocument(
  deps: DocumentDeps,
  documentId: number,
  parseVersion: number,
  patch: {
    status?: string;
    progress?: number;
    attemptCount?: number;
    lastAttemptAt?: string;
    lastError?: string | null;
    parseError?: string | null;
  },
) {
  const updated = await deps.database.client.orm.public.Document.where((row) => row.id.eq(documentId))
    .where((row) => row.parseVersion.eq(parseVersion))
    .update(patch);
  return firstRow(updated) != null;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function readableError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const known = text.match(
    /没有解析出内容|不支持的文件类型|知识库未绑定视觉模型|解析结果过多|分块数量过多|图片过大|文件不存在|视觉模型调用失败|对象内容为空/,
  );
  return known?.[0] ?? '文档解析失败';
}
