/**
 * POST /retrieval/test。只返回分块编号、文档名、内容和分数。
 */
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@libs/auth';
import { RetrievalTestDto } from './dto/retrieval-test.dto.js';
import { RetrievalService } from './retrieval.service.js';

@Controller('retrieval')
@UseGuards(AuthGuard)
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post('test')
  /** POST /retrieval/test：执行知识库检索测试并返回命中分块。 */
  test(@Req() req: Request, @Body() body: RetrievalTestDto) {
    return this.retrievalService.test(req.user.userId, body);
  }
}
