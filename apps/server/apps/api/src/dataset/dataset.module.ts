import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';
import { ResponseModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { LlmModule } from '@libs/llm';
import { ModelModule } from '../model/model.module.js';
import { DatasetService } from './dataset.service.js';
import { DatasetController } from './dataset.controller.js';
import { DatasetRepository } from './dataset.repository.js';

@Module({
  imports: [AuthModule, DatabaseModule, ResponseModule, ModelModule, LlmModule],
  controllers: [DatasetController],
  providers: [DatasetService, DatasetRepository],
  exports: [DatasetRepository],
})
export class DatasetModule {}
