import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';
import { ResponseModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { LlmModule } from '@libs/llm';
import { EmbedModelController } from './embed-model.controller.js';
import { ModelTestController } from './model-test.controller.js';
import { ModelRepository } from './model.repository.js';
import { ModelService } from './model.service.js';
import { VisionModelController } from './vision-model.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, ResponseModule, LlmModule],
  controllers: [EmbedModelController, VisionModelController, ModelTestController],
  providers: [ModelService, ModelRepository],
  exports: [ModelRepository],
})
export class ModelModule {}
