import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';
import type { BatchDocumentStatusRequest } from '@ragflux/shared/document';

export class BatchDocumentStatusDto implements BatchDocumentStatusRequest {
  @IsArray({ message: '请提供文档编号' })
  @ArrayMinSize(1, { message: '请提供文档编号' })
  @ArrayMaxSize(100, { message: '一次最多查询 100 个文档' })
  @IsInt({ each: true, message: '文档编号不正确' })
  documentIds!: number[];
}
