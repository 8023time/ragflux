import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import type { ListSessionsRequest } from '@ragflux/shared/session';

export class ListSessionDto implements ListSessionsRequest {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '知识库不正确' })
  @Min(1, { message: '知识库不正确' })
  datasetId?: number;
}
