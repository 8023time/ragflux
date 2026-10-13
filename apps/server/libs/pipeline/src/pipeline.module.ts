import { Module } from '@nestjs/common';
import { DatabaseModule } from '@libs/database';
import { LlmModule } from '@libs/llm';
import { RedisModule } from '@libs/redis';
import { StorageModule } from '@libs/storage';
import { PipelineService } from './pipeline.service.js';

@Module({
  imports: [DatabaseModule, StorageModule, LlmModule, RedisModule],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
