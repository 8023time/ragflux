/**
 * 消费文档解析消息并执行文档图。
 * 过期的 parseVersion 由文档图丢弃。这里不提供业务 HTTP。
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PipelineService } from '@libs/pipeline';
import { QueueService } from '@libs/queue';

@Injectable()
export class WorkerService implements OnModuleInit {
  constructor(
    private readonly queue: QueueService,
    private readonly pipeline: PipelineService,
  ) {}

  onModuleInit() {
    this.queue.consume((message) => this.pipeline.runDocument(message));
  }
}
