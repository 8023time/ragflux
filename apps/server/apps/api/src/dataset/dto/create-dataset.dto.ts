import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { CreateDatasetRequest } from '@ragflux/shared/dataset';

export class CreateDatasetDto implements CreateDatasetRequest {
  @IsString({ message: '请输入知识库名称' })
  @IsNotEmpty({ message: '请输入知识库名称' })
  name!: string;

  @IsOptional()
  @IsString({ message: '描述格式不正确' })
  description?: string;

  @IsOptional()
  @IsString({ message: '请输入解析模板' })
  @IsNotEmpty({ message: '请输入解析模板' })
  chunkStrategy?: string;
}
