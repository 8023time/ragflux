import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import type { CreateUploadUrlRequest } from '@ragflux/shared/document';

const MAX_BYTES = 32 * 1024 * 1024;

export class CreateUploadUrlDto implements CreateUploadUrlRequest {
  @IsString({ message: '请输入文件名' })
  @IsNotEmpty({ message: '请输入文件名' })
  @MaxLength(200, { message: '文件名过长' })
  fileName!: string;

  @IsString({ message: '请输入文件类型' })
  @IsNotEmpty({ message: '请输入文件类型' })
  @MaxLength(200, { message: '文件类型过长' })
  contentType!: string;

  @IsInt({ message: '文件大小不正确' })
  @Min(1, { message: '文件大小不正确' })
  @Max(MAX_BYTES, { message: '文件超过 32MB' })
  sizeBytes!: number;
}
