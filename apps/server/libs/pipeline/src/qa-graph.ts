/**
 * 问答图由 API 调用。先判断直接检索、改写或拆成子问题，再召回重排，最后流式生成。
 * 引用编号 [n] 对应当次重排后的名次。消息落库由 API 完成。
 */
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import type { RetrievalHit } from '@ragflux/shared/retrieval';
import type { VectorStoreService } from '@libs/database';
import type { LlmService, ModelEndpoint } from '@libs/llm';
import { retrieveChunks } from './retrieve.js';

type HistoryItem = { role: string; content: string };

type QaDeps = {
  vectorStore: VectorStoreService;
  llm: LlmService;
};

export type QaInput = {
  datasetId: number;
  endpoint: ModelEndpoint;
  question: string;
  history: HistoryItem[];
  topK: number;
  onDelta: (text: string) => void;
};

type QaState = {
  route: 'direct' | 'rewrite' | 'decompose';
  queries: string[];
  hits: RetrievalHit[];
  answer: string;
};

export async function runQaGraph(deps: QaDeps, input: QaInput): Promise<{ answer: string; hits: RetrievalHit[] }> {
  const planned: { queries: string[] } = { queries: [] };
  const chain = new RunnableLambda({
    func: async (state: QaState): Promise<QaState> => {
      const classification = await classify(deps, input, planned);
      let queries: string[];
      if (classification.route === 'direct') {
        queries = [input.question];
      } else if (classification.route === 'rewrite') {
        queries = [await rewrite(deps, input, planned)];
      } else {
        queries = await decompose(deps, input, planned);
      }
      const hits = await mergeHits(deps, input, queries.length > 0 ? queries : [input.question]);
      const answer = await generate(deps, input, hits);
      return { ...state, ...classification, queries, hits, answer };
    },
  });

  const result = await chain.invoke({ route: 'direct', queries: [], hits: [], answer: '' });
  return { answer: result.answer, hits: result.hits };
}

async function classify(deps: QaDeps, input: QaInput, planned: { queries: string[] }): Promise<{ route: string }> {
  if (input.history.length === 0) {
    planned.queries = [input.question];
    return { route: 'direct' };
  }
  const raw = await deps.llm.complete(deps.llm.chatEndpoint(), [
    new SystemMessage(
      '你是检索路由器。只输出 JSON：{"route":"direct"|"rewrite"|"decompose","queries":["..."]}。direct 表示当前问题可以独立检索；rewrite 表示要结合历史改写成一个问题；decompose 表示拆成最多 4 个子问题。',
    ),
    new HumanMessage(`历史：\n${formatHistory(input.history)}\n\n当前问题：${input.question}`),
  ]);
  const parsed = readRoute(raw);
  planned.queries = parsed.queries;
  return { route: parsed.route };
}

async function rewrite(deps: QaDeps, input: QaInput, planned: { queries: string[] }): Promise<string> {
  const ready = planned.queries.find((query) => query.trim());
  if (ready) {
    return ready.trim();
  }
  const text = await deps.llm.complete(deps.llm.chatEndpoint(), [
    new SystemMessage('结合历史把当前问题改写成一句可以独立检索的话。只输出这句问题。'),
    new HumanMessage(`历史：\n${formatHistory(input.history)}\n\n当前问题：${input.question}`),
  ]);
  return text.trim() || input.question;
}

async function decompose(deps: QaDeps, input: QaInput, planned: { queries: string[] }): Promise<string[]> {
  const ready = planned.queries
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (ready.length > 0) {
    return ready;
  }
  const text = await deps.llm.complete(deps.llm.chatEndpoint(), [
    new SystemMessage('把问题拆成最多 4 个可以分别检索的子问题。每行一个，不要编号。'),
    new HumanMessage(input.question),
  ]);
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^\d+[.、]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
  return lines.length > 0 ? lines : [input.question];
}

async function mergeHits(deps: QaDeps, input: QaInput, queries: string[]): Promise<RetrievalHit[]> {
  const merged = new Map<string, RetrievalHit>();
  for (const query of queries) {
    const hits = await retrieveChunks(
      deps.vectorStore,
      deps.llm,
      input.datasetId,
      input.endpoint,
      query,
      input.topK,
    );
    for (const hit of hits) {
      const existing = merged.get(hit.chunkId);
      if (!existing || hit.score > existing.score) {
        merged.set(hit.chunkId, hit);
      }
    }
  }
  return [...merged.values()].sort((left, right) => right.score - left.score).slice(0, input.topK);
}

async function generate(deps: QaDeps, input: QaInput, hits: RetrievalHit[]): Promise<string> {
  if (hits.length === 0) {
    const answer = '知识库里没有找到相关内容。';
    input.onDelta(answer);
    return answer;
  }
  const evidence = hits
    .map((hit, index) => `[${index + 1}] ${hit.documentName}\n${hit.content.slice(0, 1500)}`)
    .join('\n\n');
  const messages = [
    new SystemMessage(
      '你是知识库问答助手。只根据给定分块回答，用 [n] 标注依据，n 是分块序号。资料不足就说明，不要编造。',
    ),
    ...input.history
      .slice(-8)
      .map((item) =>
        item.role === 'assistant'
          ? new AIMessage(item.content.slice(0, 1000))
          : new HumanMessage(item.content.slice(0, 1000)),
      ),
    new HumanMessage(`问题：${input.question}\n\n分块：\n${evidence}`),
  ];
  let answer = '';
  for await (const delta of deps.llm.stream(deps.llm.chatEndpoint(), messages)) {
    answer += delta;
    input.onDelta(delta);
  }
  return answer;
}

function formatHistory(history: HistoryItem[]): string {
  return history
    .slice(-8)
    .map((item) => `${item.role === 'assistant' ? '助手' : '用户'}：${item.content.slice(0, 500)}`)
    .join('\n');
}

function readRoute(text: string): { route: 'direct' | 'rewrite' | 'decompose'; queries: string[] } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { route: 'rewrite', queries: [] };
  }
  try {
    const parsed = JSON.parse(match[0]) as { route?: string; queries?: unknown };
    const queries = Array.isArray(parsed.queries)
      ? parsed.queries.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 4)
      : [];
    if (parsed.route === 'direct' || parsed.route === 'rewrite' || parsed.route === 'decompose') {
      return { route: parsed.route, queries };
    }
  } catch {
    return { route: 'rewrite', queries: [] };
  }
  return { route: 'rewrite', queries: [] };
}
