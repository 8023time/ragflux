import { Module } from '@nestjs/common';
import { AppConfigModule } from '@libs/config';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module.js';
import { ChunkModule } from './chunk/chunk.module.js';
import { DatasetModule } from './dataset/dataset.module.js';
import { DocumentModule } from './document/document.module.js';
import { ModelModule } from './model/model.module.js';
import { RetrievalModule } from './retrieval/retrieval.module.js';
import { SessionModule } from './session/session.module.js';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    DatasetModule,
    ModelModule,
    DocumentModule,
    ChunkModule,
    RetrievalModule,
    SessionModule,
    ChatModule,
  ],
})
export class ApiModule {}
