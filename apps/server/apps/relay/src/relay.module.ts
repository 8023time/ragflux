import { Module } from '@nestjs/common';
import { AppConfigModule } from '@libs/config';
import { DatabaseModule } from '@libs/database';
import { QueueModule } from '@libs/queue';
import { RelayService } from './relay.service.js';

@Module({
  imports: [AppConfigModule, DatabaseModule, QueueModule],
  providers: [RelayService],
})
export class RelayModule {}
