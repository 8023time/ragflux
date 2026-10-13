/**
 * 会话必须同时属于当前用户和指定知识库。不存在或不属于用户时返回 404。
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CitationView,
  MessageView,
  SessionView,
} from '@ragflux/shared/session';
import { ResponseService } from '@libs/common';
import { DatasetRepository } from '../dataset/dataset.repository.js';
import type { CreateSessionDto } from './dto/create-session.dto.js';
import type { UpdateSessionDto } from './dto/update-session.dto.js';
import { SessionRepository } from './session.repository.js';

type SessionRow = {
  id: number;
  datasetId: number;
  title: string;
  status: number;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly datasets: DatasetRepository,
    private readonly responseService: ResponseService,
  ) {}

  /** 列出当前用户的会话。
   * @param userId 当前用户编号
   * @param datasetId 可选知识库编号
   * @returns 会话列表响应
   */
  async list(userId: number, datasetId?: number) {
    if (datasetId !== undefined) {
      const dataset = await this.datasets.findByUser(userId, datasetId);
      if (!dataset) {
        throw new NotFoundException('知识库不存在');
      }
    }
    const rows = await this.sessions.listByUser(userId, datasetId);
    return this.responseService.success<SessionView[]>(rows.map(toView));
  }

  /** 创建当前用户的会话。
   * @param userId 当前用户编号
   * @param body 创建请求体
   * @returns 新建的会话响应
   */
  async create(userId: number, body: CreateSessionDto) {
    const dataset = await this.datasets.findByUser(userId, body.datasetId);
    if (!dataset) {
      throw new NotFoundException('知识库不存在');
    }
    if (await this.sessions.hasEmptySession(userId, body.datasetId)) {
      throw new ConflictException('请先完成当前空会话，再新建会话');
    }
    const row = await this.sessions.create({
      userId,
      datasetId: body.datasetId,
      title: body.title ?? '',
    });
    return this.responseService.success<SessionView>(toView(row));
  }

  /** 更新当前用户的会话标题。
   * @param userId 当前用户编号
   * @param sessionId 会话编号
   * @param body 更新请求体
   * @returns 更新后的会话响应
   */
  async update(userId: number, sessionId: number, body: UpdateSessionDto) {
    const row = await this.sessions.updateTitle(userId, sessionId, body.title);
    if (!row) {
      throw new NotFoundException('会话不存在');
    }
    return this.responseService.success<SessionView>(toView(row));
  }

  /** 删除当前用户的会话及历史消息。
   * @param userId 当前用户编号
   * @param sessionId 会话编号
   * @returns 删除结果响应
   */
  async remove(userId: number, sessionId: number) {
    const session = await this.sessions.findByUser(userId, sessionId);
    if (!session) {
      throw new NotFoundException('会话不存在');
    }
    await this.sessions.deleteSession(session.id);
    return this.responseService.success<null>(null);
  }

  /** 获取当前用户会话的消息和引用。
   * @param userId 当前用户编号
   * @param sessionId 会话编号
   * @returns 消息列表响应
   */
  async messages(userId: number, sessionId: number) {
    const session = await this.sessions.findByUser(userId, sessionId);
    if (!session) {
      throw new NotFoundException('会话不存在');
    }
    const rows = await this.sessions.listMessages(sessionId);
    const citations = rows.length === 0 ? [] : await this.sessions.listCitations(rows.map((row) => row.id));
    const byMessage = new Map<number, CitationView[]>();
    for (const citation of citations) {
      const list = byMessage.get(citation.messageId) ?? [];
      list.push({ position: citation.position, chunkId: citation.chunkId, score: citation.score });
      byMessage.set(citation.messageId, list);
    }
    const data: MessageView[] = rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
      citations: byMessage.get(row.id) ?? [],
    }));
    return this.responseService.success<MessageView[]>(data);
  }
}

function toView(row: SessionRow): SessionView {
  return {
    id: row.id,
    datasetId: row.datasetId,
    title: row.title,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
