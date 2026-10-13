import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { UpdateSessionRequest } from '@ragflux/shared/session';

export class UpdateSessionDto implements UpdateSessionRequest {
  @IsString({ message: '请输入标题' })
  @IsNotEmpty({ message: '请输入标题' })
  @MaxLength(80, { message: '标题过长' })
  title!: string;
}
