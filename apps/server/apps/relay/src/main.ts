import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { AppConfig } from '@libs/config';
import { RelayModule } from './relay.module.js';

async function bootstrap() {
  const logger = new Logger('Relay');
  logger.log('Starting relay application');

  const app = await NestFactory.create(RelayModule);
  const config = app.get(ConfigService<AppConfig>);
  const port = config.getOrThrow<AppConfig['server']>('server').relayPort;
  await app.listen(port);

  logger.log(`Relay application is listening on port ${port}`);
}
await bootstrap();
