import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { DatabaseModule } from '@libs/database';
import { ResponseModule } from '@libs/common';
import { AuthModule as AuthLibModule } from '@libs/auth';
import { MailModule } from '@libs/mail';
import { RedisModule } from '@libs/redis';
import { AuthRepository } from './auth.repository.js';

@Module({
  imports: [AuthLibModule, DatabaseModule, ResponseModule, MailModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
