import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { RetrievalTestRequest } from '@ragflux/shared/retrieval';

export class RetrievalTestDto implements RetrievalTestRequest {
  @IsInt({ message: '知识库不正确' })
  @Min(1, { message: '知识库不正确' })
  datasetId!: number;

  @IsString({ message: '请输入问题' })
  @IsNotEmpty({ message: '请输入问题' })
  @MaxLength(2000, { message: '问题过长' })
  query!: string;

  @IsOptional()
  @IsInt({ message: '返回条数不正确' })
  @Min(1, { message: '返回条数不正确' })
  @Max(20, { message: '返回条数不正确' })
  topK?: number;
}
