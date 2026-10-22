import type { SendCodeRequest } from '@ragflux/shared/auth';
import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class SendCodeDto implements SendCodeRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: '请输入正确的邮箱' })
  @IsEmail({}, { message: '请输入正确的邮箱' })
  email!: string;
}
