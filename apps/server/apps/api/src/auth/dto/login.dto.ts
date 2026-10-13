import type { LoginRequest } from '@ragflux/shared/auth';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class LoginDto implements LoginRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: '请输入正确的邮箱' })
  @IsEmail({}, { message: '请输入正确的邮箱' })
  email!: string;

  @IsString({ message: '请输入 6 位验证码' })
  @Length(6, 6, { message: '请输入 6 位验证码' })
  @Matches(/^\d{6}$/, { message: '请输入 6 位数字验证码' })
  code!: string;
}
