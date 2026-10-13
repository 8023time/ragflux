import { IsBoolean } from 'class-validator';
import type { UpdateDocumentRequest } from '@ragflux/shared/document';

export class UpdateDocumentDto implements UpdateDocumentRequest {
  @IsBoolean({ message: '请指定是否启用' })
  enabled!: boolean;
}
