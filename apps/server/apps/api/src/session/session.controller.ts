/**
 * 会话和历史消息。用户编号来自登录态，不从请求体读取。
 */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@libs/auth';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { ListSessionDto } from './dto/list-session.dto.js';
import { UpdateSessionDto } from './dto/update-session.dto.js';
import { SessionService } from './session.service.js';

@Controller('sessions')
@UseGuards(AuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  /** GET /sessions：列出当前用户的会话。 */
  list(@Req() req: Request, @Query() query: ListSessionDto) {
    return this.sessionService.list(req.user.userId, query.datasetId);
  }

  @Post()
  /** POST /sessions：创建会话。 */
  create(@Req() req: Request, @Body() body: CreateSessionDto) {
    return this.sessionService.create(req.user.userId, body);
  }

  @Put(':sessionId')
  /** PUT /sessions/:sessionId：更新会话标题。 */
  update(@Req() req: Request, @Param('sessionId', ParseIntPipe) sessionId: number, @Body() body: UpdateSessionDto) {
    return this.sessionService.update(req.user.userId, sessionId, body);
  }

  @Delete(':sessionId')
  /** DELETE /sessions/:sessionId：删除会话及其消息。 */
  remove(@Req() req: Request, @Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.sessionService.remove(req.user.userId, sessionId);
  }

  @Get(':sessionId/messages')
  /** GET /sessions/:sessionId/messages：获取会话消息和引用。 */
  messages(@Req() req: Request, @Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.sessionService.messages(req.user.userId, sessionId);
  }
}
