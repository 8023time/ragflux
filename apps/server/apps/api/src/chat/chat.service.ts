/**
 * 问答接口跑问答图，用 SSE 推送增量文本。
 * 结束后把助手消息和 [n] 对应的分块编号、名次、分数写入数据库。
 * 对话模型来自配置。嵌入模型优先用知识库绑定的用户模型，未绑定时用配置里的默认嵌入模型。
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import type { RetrievalHit } from '@ragflux/shared/retrieval';
import type { ChatStreamEvent } from '@ragflux/shared/session';
import { LlmService, type ModelEndpoint } from '@libs/llm';
import { PipelineService } from '@libs/pipeline';
import { DatasetRepository } from '../dataset/dataset.repository.js';
import { ModelRepository } from '../model/model.repository.js';
import { SessionRepository, type CitationInput } from '../session/session.repository.js';
import type { ChatCompletionDto } from './dto/chat-completion.dto.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly datasets: DatasetRepository,
    private readonly models: ModelRepository,
    private readonly pipeline: PipelineService,
    private readonly llm: LlmService,
  ) {}

  /** 执行当前会话问答并通过 SSE 流式返回结果。
   * @param userId 当前用户编号
   * @param body 问答请求体
   * @param res HTTP 响应对象
   * @returns SSE 响应流
   */
  async complete(userId: number, body: ChatCompletionDto, res: Response) {
    const session = await this.sessions.findByUser(userId, body.sessionId);
    if (!session) {
      throw new NotFoundException('会话不存在');
    }
    const dataset = await this.datasets.findByUser(userId, session.datasetId);
    if (!dataset) {
      throw new NotFoundException('知识库不存在');
    }
    const endpoint = await this.embedEndpoint(userId, dataset.embedModelId);

    const history = await this.sessions.listMessages(session.id);
    await this.sessions.createMessage({ sessionId: session.id, role: 'user', content: body.content });
    if (!session.title.trim()) {
      await this.sessions.updateTitle(userId, session.id, body.content.slice(0, 40));
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const result = await this.pipeline.answer({
        datasetId: dataset.id,
        endpoint,
        question: body.content,
        history: history.map((item) => ({ role: item.role, content: item.content })),
        topK: 6,
        onDelta: (content) => {
          if (!res.writableEnded) {
            writeEvent(res, { type: 'delta', content });
          }
        },
      });
      const citations = citationsFromAnswer(result.answer, result.hits);
      const message = await this.sessions.createAssistantMessage(session.id, result.answer, citations);
      writeEvent(res, { type: 'done', messageId: message.id, citations });
    } catch (error) {
      const message = error instanceof Error ? error.message : '回答失败';
      if (!res.writableEnded) {
        writeEvent(res, { type: 'error', message });
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  /** 知识库绑了用户嵌入模型就用那一条，否则用配置里的默认模型。 */
  private async embedEndpoint(userId: number, embedModelId: number | null): Promise<ModelEndpoint> {
    if (!embedModelId) {
      return this.llm.embeddingEndpoint();
    }
    const model = await this.models.findEmbed(userId, embedModelId);
    if (!model || !model.apiKey) {
      throw new BadRequestException('请先为知识库绑定嵌入模型');
    }
    return { baseUrl: model.apiUrl, apiKey: model.apiKey, model: model.modelId };
  }
}

function citationsFromAnswer(answer: string, hits: RetrievalHit[]): CitationInput[] {
  const seen = new Set<number>();
  const citations: CitationInput[] = [];
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const position = Number(match[1]);
    if (seen.has(position) || position < 1 || position > hits.length) {
      continue;
    }
    seen.add(position);
    const hit = hits[position - 1];
    citations.push({ position, chunkId: hit.chunkId, score: hit.score });
  }
  return citations;
}

function writeEvent(res: Response, event: ChatStreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
