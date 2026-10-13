import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@libs/auth';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SendCodeDto } from './dto/send-code.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  /** POST /auth/send-code：发送登录验证码并执行发送限流。 */
  sendCode(@Body() body: SendCodeDto) {
    return this.authService.sendVerificationCode(body);
  }

  @Post('login')
  /** POST /auth/login：校验验证码并返回访问令牌。 */
  login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(body, res);
  }

  @Post('refresh')
  /** POST /auth/refresh：使用 Cookie 刷新访问令牌。 */
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  /** GET /auth/me：返回当前登录用户信息。 */
  me(@Req() req: Request) {
    return this.authService.me(req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  /** POST /auth/logout：清除当前登录会话的刷新令牌 Cookie。 */
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
