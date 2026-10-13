import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { AppConfig } from '@libs/config';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
  const logger = new Logger('Worker');
  logger.log('Starting worker application');

  const app = await NestFactory.create(WorkerModule);
  const config = app.get(ConfigService<AppConfig>);
  const port = config.getOrThrow<AppConfig['server']>('server').workerPort;
  await app.listen(port);

  logger.log(`Worker application is listening on port ${port}`);
}
await bootstrap();
