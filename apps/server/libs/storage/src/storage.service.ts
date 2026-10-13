import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@libs/config';

export interface UploadToken {
  key: string;
  url: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
}

const DEFAULT_EXPIRES_SECONDS = 300;
const MAX_EXPIRES_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly publicBaseUrl: string;

  constructor(configService: ConfigService<AppConfig>) {
    const storageConfig = configService.getOrThrow('storage').r2;
    this.endpoint = storageConfig.endpoint.replace(/\/$/, '');
    this.client = new S3Client({
      region: storageConfig.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    this.bucketName = storageConfig.bucketName;
    this.publicBaseUrl = storageConfig.publicBaseUrl.replace(/\/$/, '');
  }

  /** 服务端读取对象全文。解析原文、文本预览用。 */
  async get(key: string): Promise<Buffer> {
    const output = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.normalizeKey(key),
      }),
    );
    if (!output.Body) {
      throw new Error('对象内容为空');
    }
    return Buffer.from(await output.Body.transformToByteArray());
  }

  /** 服务端上传。解析流水线保存图片用。 */
  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: this.normalizeKey(key),
        Body: data,
        ContentType: contentType || undefined,
      }),
    );
  }

  /** 删除对象。对象不存在时 S3/R2 同样返回成功。 */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: this.normalizeKey(key),
      }),
    );
  }

  /**
   * 前端直传凭证。
   * SDK 不会把 Content-Type 签进地址，浏览器再带上这个头时 R2 会返回 403。
   * 因此这里不要求调用方发送额外请求头。
   */
  async presignPut(key: string, _contentType: string, expiresSeconds: number): Promise<UploadToken> {
    const objectKey = this.normalizeKey(key);
    const expiresIn = this.normalizeExpires(expiresSeconds);
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      }),
      { expiresIn },
    );
    return {
      key: objectKey,
      url: this.publicUrl(objectKey),
      uploadUrl,
      method: 'PUT',
      headers: {},
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  /**
   * 限时读取地址。
   * filename 非空时按附件下载；contentType 非空时覆盖响应类型，供 PDF 和图片内嵌预览。
   */
  async presignGet(key: string, filename: string, contentType: string, expiresSeconds: number): Promise<string> {
    const disposition = filename.trim() ? `attachment; filename="${filename.replaceAll('"', '')}"` : undefined;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.normalizeKey(key),
        ResponseContentDisposition: disposition,
        ResponseContentType: contentType.trim() || undefined,
      }),
      { expiresIn: this.normalizeExpires(expiresSeconds) },
    );
  }

  private publicUrl(key: string): string {
    if (!this.publicBaseUrl) {
      return `${this.endpoint}/${this.bucketName}/${key}`;
    }
    return `${this.publicBaseUrl}/${key}`;
  }

  private normalizeKey(key: string): string {
    const normalized = key.trim().replace(/^\/+/, '');
    if (!normalized || normalized.split('/').includes('..')) {
      throw new Error('对象键不合法');
    }
    return normalized;
  }

  private normalizeExpires(expiresSeconds: number): number {
    if (expiresSeconds <= 0 || expiresSeconds > MAX_EXPIRES_SECONDS) {
      return DEFAULT_EXPIRES_SECONDS;
    }
    return Math.floor(expiresSeconds);
  }
}
