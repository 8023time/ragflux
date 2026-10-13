/**
 * 轮询 t_outbox，把到期的 pending 行发布到 RabbitMQ。
 * 发布成功标为 published。失败增加次数并推迟 nextAttemptAt，正文不进队列。
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '@libs/database';
import { QueueService, readDocumentParseMessage } from '@libs/queue';

const POLL_MS = 2_000;
const BATCH = 20;

@Injectable()
export class RelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RelayService.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly queue: QueueService,
  ) {}

  onModuleInit() {
    this.resetPublishing();
    this.timer = setInterval(() => {
      this.tick();
    }, POLL_MS);
    this.tick();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /** 进程中途退出会把行留在 publishing，启动时退回 pending 以便重试。 */
  private async resetPublishing() {
    await this.database.client.orm.public.Outbox.where((row) => row.status.eq('publishing')).update({
      status: 'pending',
    });
  }

  private async tick() {
    if (this.ticking) {
      return;
    }
    this.ticking = true;
    try {
      const now = new Date().toISOString();
      const rows = await this.database.client.orm.public.Outbox.where((row) => row.status.eq('pending'))
        .where((row) => row.nextAttemptAt.lte(now))
        .orderBy((row) => row.id.asc())
        .limit(BATCH)
        .all();
      for (const row of rows) {
        await this.publishRow(row.id, row.payload, row.publishAttempts);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`扫描 Outbox 失败: ${message}`);
    } finally {
      this.ticking = false;
    }
  }

  private async publishRow(id: number, payload: unknown, publishAttempts: number) {
    const claimed = await this.database.client.orm.public.Outbox.where((row) => row.id.eq(id))
      .where((row) => row.status.eq('pending'))
      .update({ status: 'publishing' });
    if (!firstRow(claimed)) {
      return;
    }

    const message = readDocumentParseMessage(payload);
    if (!message) {
      await this.database.client.orm.public.Outbox.where((row) => row.id.eq(id)).update({
        status: 'failed',
        lastError: '消息格式不正确',
      });
      return;
    }

    try {
      await this.queue.publish(message);
      await this.database.client.orm.public.Outbox.where((row) => row.id.eq(id)).update({
        status: 'published',
        publishedAt: new Date().toISOString(),
        lastError: null,
      });
    } catch (error) {
      const attempts = publishAttempts + 1;
      const reason = (error instanceof Error ? error.message : '发布失败').slice(0, 500);
      const delayMs = Math.min(300, 5 * 2 ** Math.max(0, attempts - 1)) * 1000;
      await this.database.client.orm.public.Outbox.where((row) => row.id.eq(id)).update({
        status: 'pending',
        publishAttempts: attempts,
        lastError: reason,
        nextAttemptAt: new Date(Date.now() + delayMs).toISOString(),
      });
      this.logger.warn(`Outbox 发布失败 id=${id} attempts=${attempts}: ${reason}`);
    }
  }
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
