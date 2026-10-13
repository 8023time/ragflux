/**
 * 对话、嵌入和视觉都走 OpenAI 兼容接口。
 * 业务只调用这里，不直接散落 LangChain SDK。
 * 对话、默认嵌入和默认视觉读配置。知识库绑定了用户自己的模型时，由调用方传入那一条地址。
 * 失败时只向调用方抛出简短中文错误，密钥和第三方原文留在日志里并会打码。
 */
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@libs/config';

export type ModelEndpoint = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const TEST_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  /** 配置中的对话模型。问答图只用这一条，不用知识库上的视觉模型。 */
  chatEndpoint(): ModelEndpoint {
    const chat = this.configService.get('llm', { infer: true }).chat;
    return { baseUrl: chat.baseUrl, apiKey: chat.apiKey, model: chat.model };
  }

  /** 配置中的嵌入模型。知识库没有绑定用户模型时用这一条。 */
  embeddingEndpoint(): ModelEndpoint {
    const embedding = this.configService.get('llm', { infer: true }).embedding;
    return { baseUrl: embedding.baseUrl, apiKey: embedding.apiKey, model: embedding.model };
  }

  /** 配置中的视觉模型。知识库没有绑定用户模型时用这一条。 */
  visionEndpoint(): ModelEndpoint {
    const vision = this.configService.get('llm', { infer: true }).vision;
    return { baseUrl: vision.baseUrl, apiKey: vision.apiKey, model: vision.model };
  }

  /** 嵌入一条文本。检索时对问题和候选分块各算一次，结果不写回数据库。 */
  async embedQuery(endpoint: ModelEndpoint, text: string): Promise<number[]> {
    return this.guard(endpoint, '嵌入模型调用失败', async () => {
      const vectors = await this.embeddings(endpoint).embedQuery(text);
      if (vectors.length === 0) {
        throw new Error('空向量');
      }
      return vectors;
    });
  }

  /** 同一批候选分块共用一次嵌入请求。 */
  async embedDocuments(endpoint: ModelEndpoint, texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    return this.guard(endpoint, '嵌入模型调用失败', () => this.embeddings(endpoint).embedDocuments(texts));
  }

  /** 测试嵌入：成功返回向量即可，不落库。 */
  async testEmbedding(endpoint: ModelEndpoint): Promise<void> {
    await this.embedQuery(endpoint, 'ping');
  }

  /** 测试视觉：发一张 1 像素图片，能返回文本即可。 */
  async testVision(endpoint: ModelEndpoint): Promise<void> {
    await this.describeImage(endpoint, Buffer.from(TEST_PNG, 'base64'), 'image/png');
  }

  /** 图片分块的描述。原文已经在对象存储，这里只把描述写入分块内容。 */
  async describeImage(endpoint: ModelEndpoint, image: Buffer, mimeType: string): Promise<string> {
    return this.guard(endpoint, '视觉模型调用失败', async () => {
      const model = this.chat(endpoint, 0);
      const response = await model.invoke([
        new HumanMessage({
          content: [
            { type: 'text', text: '用中文简要描述这张图片，保留图中的文字。不要寒暄。' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${image.toString('base64')}` },
            },
          ],
        }),
      ]);
      const text = messageText(response.content).trim();
      if (!text) {
        throw new Error('视觉模型没有返回描述');
      }
      return text;
    });
  }

  /** 路由、改写等短调用。 */
  async complete(endpoint: ModelEndpoint, messages: BaseMessage[]): Promise<string> {
    return this.guard(endpoint, '对话模型调用失败', async () => {
      const response = await this.chat(endpoint, 0, false).invoke(messages);
      return messageText(response.content);
    });
  }

  /** 问答正文。调用方负责把增量写进 SSE。 */
  async *stream(endpoint: ModelEndpoint, messages: BaseMessage[]): AsyncGenerator<string> {
    const model = this.chat(endpoint, 0.2, false);
    let stream: AsyncIterable<{ content: unknown }>;
    try {
      stream = await model.stream(messages);
    } catch (error) {
      this.logFailure(endpoint, error);
      throw new Error('对话模型调用失败');
    }

    try {
      for await (const chunk of stream) {
        const text = messageText(chunk.content);
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logFailure(endpoint, error);
      throw new Error('对话模型调用失败');
    }
  }

  private chat(endpoint: ModelEndpoint, temperature: number, thinking = true) {
    return new ChatOpenAI({
      model: endpoint.model,
      apiKey: endpoint.apiKey,
      temperature,
      timeout: 60_000,
      streamUsage: false,
      // 千问默认先把草稿写进 reasoning_content，content 保持空字符串。
      // 问答只读 content，不关掉思考时页面会一直空白。
      ...(thinking ? {} : { modelKwargs: { enable_thinking: false } }),
      configuration: { baseURL: endpoint.baseUrl.replace(/\/+$/, '') },
    });
  }

  private embeddings(endpoint: ModelEndpoint) {
    return new OpenAIEmbeddings({
      model: endpoint.model,
      apiKey: endpoint.apiKey,
      timeout: 30_000,
      configuration: { baseURL: endpoint.baseUrl.replace(/\/+$/, '') },
    });
  }

  private async guard<T>(endpoint: ModelEndpoint, message: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof Error && error.message === message) {
        throw error;
      }
      this.logFailure(endpoint, error);
      throw new Error(message);
    }
  }

  private logFailure(endpoint: ModelEndpoint, error: unknown) {
    const raw = error instanceof Error ? error.message : String(error);
    const safe = endpoint.apiKey ? raw.replaceAll(endpoint.apiKey, '***') : raw;
    this.logger.error(`模型调用失败 model=${endpoint.model}: ${safe}`);
  }
}

function messageText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
        return part.text;
      }
      return '';
    })
    .join('');
}
