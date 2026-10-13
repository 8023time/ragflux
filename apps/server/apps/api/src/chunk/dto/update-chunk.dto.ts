import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpdateChunkRequest } from '@ragflux/shared/chunk';

export class UpdateChunkDto implements UpdateChunkRequest {
  @IsOptional()
  @IsString({ message: '分块内容不正确' })
  @MinLength(1, { message: '分块内容不能为空' })
  @MaxLength(20000, { message: '分块内容过长' })
  content?: string;

  @IsOptional()
  @IsBoolean({ message: '请指定是否启用' })
  enabled?: boolean;
}
