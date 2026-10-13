import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@libs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(configService: ConfigService<AppConfig, true>) {
    const redis = configService.get('redis', { infer: true });
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password || undefined,
      db: redis.db,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis 错误: ${error.message}`);
    });
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.log(`Redis 已连接 ${this.client.options.host}:${this.client.options.port}/${this.client.options.db}`);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
