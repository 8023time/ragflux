import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { CreateModelRequest } from '@ragflux/shared/model';

export class CreateVisionModelDto implements CreateModelRequest {
  @IsString({ message: '请输入名称' })
  @IsNotEmpty({ message: '请输入名称' })
  @MaxLength(100, { message: '名称过长' })
  name!: string;

  @IsString({ message: '请输入模型标识' })
  @IsNotEmpty({ message: '请输入模型标识' })
  @MaxLength(200, { message: '模型标识过长' })
  modelId!: string;

  @IsString({ message: '请输入接口地址' })
  @Matches(/^https?:\/\/.+/i, { message: '接口地址不正确' })
  @MaxLength(500, { message: '接口地址过长' })
  apiUrl!: string;

  @IsOptional()
  @IsString({ message: '密钥格式不正确' })
  @MaxLength(500, { message: '密钥过长' })
  apiKey?: string;
}
