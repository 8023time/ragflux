import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';
import { ResponseModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { DatasetModule } from '../dataset/dataset.module.js';
import { DocumentModule } from '../document/document.module.js';
import { ChunkController } from './chunk.controller.js';
import { ChunkRepository } from './chunk.repository.js';
import { ChunkService } from './chunk.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, ResponseModule, DatasetModule, DocumentModule],
  controllers: [ChunkController],
  providers: [ChunkService, ChunkRepository],
})
export class ChunkModule {}
