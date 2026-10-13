import { Module } from '@nestjs/common';
import { AppConfigModule } from '@libs/config';
import { PipelineModule } from '@libs/pipeline';
import { QueueModule } from '@libs/queue';
import { WorkerService } from './worker.service.js';

@Module({
  imports: [AppConfigModule, QueueModule, PipelineModule],
  providers: [WorkerService],
})
export class WorkerModule {}
