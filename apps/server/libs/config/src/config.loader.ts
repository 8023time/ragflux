import { globalConfig } from '@ragflux/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(globalConfig.development.ports.api),
  RELAY_PORT: z.coerce.number().int().positive().default(globalConfig.development.ports.relay),
  WORKER_PORT: z.coerce.number().int().positive().default(globalConfig.development.ports.worker),
  CORS_ORIGINS: z.string().default(globalConfig.development.urls.web),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1, '请设置 DB_USER'),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().min(1, '请设置 DB_DATABASE'),
  R2_REGION: z.string().min(1, '请设置 R2_REGION'),
  R2_ENDPOINT: z.string().min(1, '请设置 R2_ENDPOINT'),
  R2_ACCESS_KEY_ID: z.string().min(1, '请设置 R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, '请设置 R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: z.string().min(1, '请设置 R2_BUCKET_NAME'),
  R2_PUBLIC_BASE_URL: z.string().min(1, '请设置 R2_PUBLIC_BASE_URL'),
  JWT_SECRET: z.string().min(1, '请设置 JWT_SECRET'),
  LLM_CHAT_BASE_URL: z.string().min(1, '请设置 LLM_CHAT_BASE_URL'),
  LLM_CHAT_API_KEY: z.string().min(1, '请设置 LLM_CHAT_API_KEY'),
  LLM_CHAT_MODEL: z.string().min(1, '请设置 LLM_CHAT_MODEL'),
  LLM_VISION_BASE_URL: z.string().min(1, '请设置 LLM_VISION_BASE_URL'),
  LLM_VISION_API_KEY: z.string().min(1, '请设置 LLM_VISION_API_KEY'),
  LLM_VISION_MODEL: z.string().min(1, '请设置 LLM_VISION_MODEL'),
  LLM_EMBEDDING_BASE_URL: z.string().min(1, '请设置 LLM_EMBEDDING_BASE_URL'),
  LLM_EMBEDDING_API_KEY: z.string().min(1, '请设置 LLM_EMBEDDING_API_KEY'),
  LLM_EMBEDDING_MODEL: z.string().min(1, '请设置 LLM_EMBEDDING_MODEL'),
  RESEND_API_KEY: z.string().min(1, '请设置 RESEND_API_KEY'),
  RESEND_FROM_EMAIL: z.string().email('请设置有效的 RESEND_FROM_EMAIL'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  RABBITMQ_URL: z.string().min(1).default('amqp://127.0.0.1:5672'),
});

export function loadAppConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`\n环境变量配置无效：\n${details}`);
  }

  const env = parsed.data;
  const corsOrigins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  console.log('11111111111111111', corsOrigins);

  return {
    environment: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    server: {
      port: env.PORT,
      relayPort: env.RELAY_PORT,
      workerPort: env.WORKER_PORT,
    },
    cors: { origins: corsOrigins },
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
    },
    storage: {
      r2: {
        region: env.R2_REGION,
        endpoint: env.R2_ENDPOINT,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucketName: env.R2_BUCKET_NAME,
        publicBaseUrl: env.R2_PUBLIC_BASE_URL,
      },
    },
    auth: {
      secret: env.JWT_SECRET,
      expiresIn: { access: '15m' as const, refresh: '7d' as const },
    },
    llm: {
      chat: {
        baseUrl: env.LLM_CHAT_BASE_URL,
        apiKey: env.LLM_CHAT_API_KEY,
        model: env.LLM_CHAT_MODEL,
      },
      vision: {
        baseUrl: env.LLM_VISION_BASE_URL,
        apiKey: env.LLM_VISION_API_KEY,
        model: env.LLM_VISION_MODEL,
      },
      embedding: {
        baseUrl: env.LLM_EMBEDDING_BASE_URL,
        apiKey: env.LLM_EMBEDDING_API_KEY,
        model: env.LLM_EMBEDDING_MODEL,
      },
    },
    mail: {
      resend: {
        apiKey: env.RESEND_API_KEY,
        from: env.RESEND_FROM_EMAIL,
      },
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
    },
    queue: {
      url: env.RABBITMQ_URL,
    },
  };
}

export type AppConfig = ReturnType<typeof loadAppConfig>;
