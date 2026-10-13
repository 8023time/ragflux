import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { AppConfig } from '@libs/config';
import { ApiModule } from './api.module.js';
import { HttpResponseInterceptor, HttpExceptionFilter } from '@libs/common';

async function bootstrap() {
  const logger = new Logger('Api');
  logger.log('Starting API application');

  const app = await NestFactory.create(ApiModule);

  // 获取配置
  const config = app.get(ConfigService<AppConfig>);
  const port = config.getOrThrow<AppConfig['server']>('server').port;
  const corsOrigins = config.getOrThrow<AppConfig['cors']>('cors').origins;

  // 全局注册 HTTP 响应拦截器
  app.useGlobalInterceptors(new HttpResponseInterceptor());

  // 全局注册 HTTP 异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局注册验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // 解决跨域问题
  app.enableCors({ origin: corsOrigins, credentials: true });

  // 添加前缀 /api
  app.setGlobalPrefix('api');

  // 启用版本控制
  app.enableVersioning({
    type: 0,
    defaultVersion: '1',
  });

  await app.listen(port);

  logger.log(`API application is listening on port ${port}`);
}
await bootstrap();
