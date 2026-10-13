/**
 * Relay 发布、Worker 消费。API 不导入本模块，因此不会连接 RabbitMQ。
 * 连接失败时按间隔重试，不挡住进程监听端口。
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import type { AppConfig } from '@libs/config';
import { DOCUMENT_PARSE_TOPIC, type DocumentParseMessage, readDocumentParseMessage } from './document-parse.js';

const RECONNECT_MS = 5_000;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private consumer: ((message: DocumentParseMessage) => Promise<void>) | null = null;
  private consuming = false;
  private closed = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  onModuleInit() {
    void this.connect();
  }

  async onModuleDestroy() {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }

  /** Worker 注册消费。连接尚未就绪时先记下处理函数，连上后再订阅。 */
  consume(handler: (message: DocumentParseMessage) => Promise<void>) {
    this.consumer = handler;
    void this.ensureConsumer();
  }

  /** Relay 发布一条解析消息。未连接时抛错，由 Outbox 记录下次重试。 */
  async publish(message: DocumentParseMessage): Promise<void> {
    const channel = this.channel;
    if (!channel) {
      throw new Error('队列未连接');
    }
    const sent = channel.sendToQueue(DOCUMENT_PARSE_TOPIC, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
    });
    if (!sent) {
      await new Promise<void>((resolve) => channel.once('drain', () => resolve()));
    }
  }

  private async connect() {
    if (this.closed || this.connection) {
      return;
    }
    const url = this.configService.get('queue', { infer: true }).url;
    try {
      const connection = await connect(url);
      connection.on('error', (error: Error) => {
        this.logger.error(`RabbitMQ 连接错误: ${error.message}`);
      });
      connection.on('close', () => {
        this.connection = null;
        this.channel = null;
        this.consuming = false;
        this.scheduleReconnect();
      });
      const channel = await connection.createChannel();
      await channel.assertQueue(DOCUMENT_PARSE_TOPIC, { durable: true });
      this.connection = connection;
      this.channel = channel;
      this.logger.log('RabbitMQ 已连接');
      await this.ensureConsumer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`RabbitMQ 连接失败: ${message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.closed || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_MS);
  }

  private async ensureConsumer() {
    if (!this.channel || !this.consumer || this.consuming) {
      return;
    }
    this.consuming = true;
    await this.channel.prefetch(1);
    const handler = this.consumer;
    await this.channel.consume(DOCUMENT_PARSE_TOPIC, (msg) => {
      if (!msg) {
        return;
      }
      void this.handle(msg, handler);
    });
  }

  private async handle(msg: ConsumeMessage, handler: (message: DocumentParseMessage) => Promise<void>) {
    const message = readDocumentParseMessage(parseJson(msg.content.toString()));
    if (!message) {
      this.channel?.ack(msg);
      this.logger.warn('丢弃无法识别的解析消息');
      return;
    }
    try {
      await handler(message);
      this.channel?.ack(msg);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      this.logger.error(`解析消息处理失败 documentId=${message.documentId}: ${text}`);
      // 不重新入队。过期任务靠 parseVersion 丢弃，失败状态写在文档上。
      this.channel?.nack(msg, false, false);
    }
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
