import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import type { ChatCompletionRequest } from '@ragflux/shared/session';

export class ChatCompletionDto implements ChatCompletionRequest {
  @IsInt({ message: '会话不正确' })
  @Min(1, { message: '会话不正确' })
  sessionId!: number;

  @IsString({ message: '请输入问题' })
  @IsNotEmpty({ message: '请输入问题' })
  @MaxLength(4000, { message: '问题过长' })
  content!: string;
}
