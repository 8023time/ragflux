import { Module } from '@nestjs/common';
import { AppConfigModule } from '@libs/config';
import { DatabaseService } from './database.service.js';
import { VectorStoreService } from './vector-store.service.js';

@Module({
  imports: [AppConfigModule],
  providers: [DatabaseService, VectorStoreService],
  exports: [DatabaseService, VectorStoreService],
})
export class DatabaseModule {}
