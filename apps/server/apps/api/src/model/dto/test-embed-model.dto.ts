import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import type { TestModelRequest } from '@ragflux/shared/model';

export class TestEmbedModelDto implements TestModelRequest {
  @IsString({ message: '请输入模型标识' })
  @IsNotEmpty({ message: '请输入模型标识' })
  @MaxLength(200, { message: '模型标识过长' })
  modelId!: string;

  @IsString({ message: '请输入接口地址' })
  @Matches(/^https?:\/\/.+/i, { message: '接口地址不正确' })
  @MaxLength(500, { message: '接口地址过长' })
  apiUrl!: string;

  @IsString({ message: '请输入密钥' })
  @IsNotEmpty({ message: '请输入密钥' })
  @MaxLength(500, { message: '密钥过长' })
  apiKey!: string;
}
