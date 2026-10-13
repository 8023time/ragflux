/**
 * POST /chat/completions。响应是 SSE，不走统一 JSON 包装。
 */
import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@libs/auth';
import { ChatService } from './chat.service.js';
import { ChatCompletionDto } from './dto/chat-completion.dto.js';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('completions')
  /** POST /chat/completions：以 SSE 流式返回当前会话的问答结果。 */
  complete(@Req() req: Request, @Body() body: ChatCompletionDto, @Res() res: Response) {
    return this.chatService.complete(req.user.userId, body, res);
  }
}
