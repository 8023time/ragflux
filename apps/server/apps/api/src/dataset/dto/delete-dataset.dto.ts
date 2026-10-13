import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class DeleteDatasetDto {
  @Type(() => Number)
  @IsInt({ message: '知识库 ID 不正确' })
  @Min(1, { message: '知识库 ID 不正确' })
  datasetId!: number;
}
