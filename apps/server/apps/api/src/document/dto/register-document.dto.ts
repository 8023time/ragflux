import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import type { RegisterDocumentRequest } from '@ragflux/shared/document';

const MAX_BYTES = 32 * 1024 * 1024;

export class RegisterDocumentDto implements RegisterDocumentRequest {
  @IsString({ message: '请输入文件名' })
  @IsNotEmpty({ message: '请输入文件名' })
  @MaxLength(200, { message: '文件名过长' })
  name!: string;

  @IsString({ message: '请输入对象键' })
  @IsNotEmpty({ message: '请输入对象键' })
  @MaxLength(500, { message: '对象键过长' })
  r2Key!: string;

  @IsString({ message: '请输入文件哈希' })
  @IsNotEmpty({ message: '请输入文件哈希' })
  @MaxLength(128, { message: '文件哈希过长' })
  fileHash!: string;

  @IsInt({ message: '文件大小不正确' })
  @Min(1, { message: '文件大小不正确' })
  @Max(MAX_BYTES, { message: '文件超过 32MB' })
  sizeBytes!: number;
}
