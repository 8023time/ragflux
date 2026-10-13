import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';
import { ResponseModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { RedisModule } from '@libs/redis';
import { StorageModule } from '@libs/storage';
import { DatasetModule } from '../dataset/dataset.module.js';
import { DocumentController } from './document.controller.js';
import { DocumentRepository } from './document.repository.js';
import { DocumentService } from './document.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, ResponseModule, StorageModule, RedisModule, DatasetModule],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentRepository],
  exports: [DocumentRepository],
})
export class DocumentModule {}
