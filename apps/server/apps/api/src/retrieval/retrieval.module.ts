import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';
import { ResponseModule } from '@libs/common';
import { LlmModule } from '@libs/llm';
import { PipelineModule } from '@libs/pipeline';
import { DatasetModule } from '../dataset/dataset.module.js';
import { ModelModule } from '../model/model.module.js';
import { RetrievalController } from './retrieval.controller.js';
import { RetrievalService } from './retrieval.service.js';

@Module({
  imports: [AuthModule, ResponseModule, LlmModule, PipelineModule, DatasetModule, ModelModule],
  controllers: [RetrievalController],
  providers: [RetrievalService],
})
export class RetrievalModule {}
