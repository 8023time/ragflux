import { IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import type { UpdateDatasetRequest } from '@ragflux/shared/dataset';

export class UpdateDatasetDto implements UpdateDatasetRequest {
  @IsOptional()
  @IsString({ message: '请输入知识库名称' })
  @IsNotEmpty({ message: '请输入知识库名称' })
  name?: string;

  @IsOptional()
  @IsString({ message: '描述格式不正确' })
  description?: string;

  @IsOptional()
  @IsString({ message: '请输入解析模板' })
  @IsNotEmpty({ message: '请输入解析模板' })
  chunkStrategy?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: '嵌入模型不正确' })
  @Min(1, { message: '嵌入模型不正确' })
  embedModelId?: number | null;

  @IsOptional()
  @IsString({ message: '嵌入模型标识不正确' })
  embedModel?: string;

  @IsOptional()
  @IsInt({ message: '视觉模型不正确' })
  @Min(0, { message: '视觉模型不正确' })
  visionModelId?: number;

  @IsOptional()
  @IsString({ message: '视觉模型标识不正确' })
  visionModel?: string;
}
