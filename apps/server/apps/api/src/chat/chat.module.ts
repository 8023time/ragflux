import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';
import { LlmModule } from '@libs/llm';
import { PipelineModule } from '@libs/pipeline';
import { DatasetModule } from '../dataset/dataset.module.js';
import { ModelModule } from '../model/model.module.js';
import { SessionModule } from '../session/session.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [AuthModule, LlmModule, PipelineModule, DatasetModule, ModelModule, SessionModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
