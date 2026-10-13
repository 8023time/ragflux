import { Module } from '@nestjs/common';
import { AuthModule } from '@libs/auth';
import { ResponseModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { DatasetModule } from '../dataset/dataset.module.js';
import { SessionController } from './session.controller.js';
import { SessionRepository } from './session.repository.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, ResponseModule, DatasetModule],
  controllers: [SessionController],
  providers: [SessionService, SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}
