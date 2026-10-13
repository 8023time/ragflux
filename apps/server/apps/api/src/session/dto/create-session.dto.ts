import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { CreateSessionRequest } from '@ragflux/shared/session';

export class CreateSessionDto implements CreateSessionRequest {
  @IsInt({ message: '知识库不正确' })
  @Min(1, { message: '知识库不正确' })
  datasetId!: number;

  @IsOptional()
  @IsString({ message: '标题不正确' })
  @IsNotEmpty({ message: '标题不正确' })
  @MaxLength(80, { message: '标题过长' })
  title?: string;
}
