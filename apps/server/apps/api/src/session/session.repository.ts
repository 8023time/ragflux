/**
 * 读写 t_session、t_message、t_message_citation。
 * 删除会话时同时删掉它的消息和引用。
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@libs/database';

export type CitationInput = {
  position: number;
  chunkId: string;
  score: number;
};

@Injectable()
export class SessionRepository {
  constructor(private readonly database: DatabaseService) {}

  /** 查询当前用户的会话，可按知识库筛选。
   * @param userId 当前用户编号
   * @param datasetId 可选知识库编号
   * @returns 会话列表
   */
  listByUser(userId: number, datasetId?: number) {
    const query = this.database.client.orm.public.Session.where((row) => row.userId.eq(userId));
    const scoped = datasetId === undefined ? query : query.where((row) => row.datasetId.eq(datasetId));
    return scoped.orderBy((row) => row.id.desc()).all();
  }

  /** 查询当前用户的指定会话。
   * @param userId 当前用户编号
   * @param sessionId 会话编号
   * @returns 会话记录，不存在时返回 null
   */
  findByUser(userId: number, sessionId: number) {
    return this.database.client.orm.public.Session.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(sessionId))
      .first();
  }

  /** 创建会话记录。
   * @param data 会话数据
   * @returns 新建的会话记录
   */
  create(data: { userId: number; datasetId: number; title: string }) {
    return this.database.client.orm.public.Session.create(data);
  }

  /** 更新当前用户会话标题。
   * @param userId 当前用户编号
   * @param sessionId 会话编号
   * @param title 新标题
   * @returns 更新后的记录，不存在时返回 null
   */
  async updateTitle(userId: number, sessionId: number, title: string) {
    const updated = await this.database.client.orm.public.Session.where((row) => row.userId.eq(userId))
      .where((row) => row.id.eq(sessionId))
      .update({ title });
    return firstRow(updated);
  }

  /** 在事务中删除会话及其消息引用。
   * @param sessionId 会话编号
   * @returns 删除完成的 Promise
   */
  async deleteSession(sessionId: number) {
    await this.database.client.transaction(async (tx) => {
      const messages = await tx.orm.public.Message.where((row) => row.sessionId.eq(sessionId))
        .select('id')
        .all();
      for (const message of messages) {
        await tx.orm.public.MessageCitation.where((row) => row.messageId.eq(message.id)).delete();
      }
      await tx.orm.public.Message.where((row) => row.sessionId.eq(sessionId)).delete();
      await tx.orm.public.Session.where((row) => row.id.eq(sessionId)).delete();
    });
  }

  /** 查询会话消息。
   * @param sessionId 会话编号
   * @returns 按时间顺序排列的消息列表
   */
  listMessages(sessionId: number) {
    return this.database.client.orm.public.Message.where((row) => row.sessionId.eq(sessionId))
      .orderBy((row) => row.id.asc())
      .all();
  }

  /** 判断指定知识库是否存在没有消息的有效会话。 */
  async hasEmptySession(userId: number, datasetId: number) {
    const sessions = await this.listByUser(userId, datasetId);
    for (const session of sessions) {
      if (session.status !== 1) continue;
      const message = await this.database.client.orm.public.Message.where((row) =>
        row.sessionId.eq(session.id),
      ).first();
      if (!message) return true;
    }
    return false;
  }

  /** 查询消息引用。
   * @param messageIds 消息编号列表
   * @returns 按引用位置排列的引用列表
   */
  listCitations(messageIds: number[]) {
    return this.database.client.orm.public.MessageCitation.where((row) => row.messageId.in(messageIds))
      .orderBy((row) => row.position.asc())
      .all();
  }

  /** 创建消息记录。
   * @param data 消息数据
   * @returns 新建的消息记录
   */
  createMessage(data: { sessionId: number; role: string; content: string }) {
    return this.database.client.orm.public.Message.create(data);
  }

  /** 在事务中创建助手消息及其引用。
   * @param sessionId 会话编号
   * @param content 助手消息内容
   * @param citations 消息引用
   * @returns 新建的助手消息
   */
  async createAssistantMessage(sessionId: number, content: string, citations: CitationInput[]) {
    return this.database.client.transaction(async (tx) => {
      const message = await tx.orm.public.Message.create({ sessionId, role: 'assistant', content });
      for (const citation of citations) {
        await tx.orm.public.MessageCitation.create({
          messageId: message.id,
          position: citation.position,
          chunkId: citation.chunkId,
          score: citation.score,
        });
      }
      return message;
    });
  }
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
