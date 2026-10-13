/**
 * 分块列表和修改。编号由解析流水线生成。
 */
import { Body, Controller, Get, Param, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@libs/auth';
import { ChunkService } from './chunk.service.js';
import { UpdateChunkDto } from './dto/update-chunk.dto.js';

@Controller()
@UseGuards(AuthGuard)
export class ChunkController {
  constructor(private readonly chunkService: ChunkService) {}

  @Get('documents/:documentId/chunks')
  /** GET /documents/:documentId/chunks：返回文档分块列表。 */
  list(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.chunkService.list(req.user.userId, documentId);
  }

  @Put('chunks/:chunkId')
  /** PUT /chunks/:chunkId：更新分块内容或启用状态。 */
  update(@Req() req: Request, @Param('chunkId') chunkId: string, @Body() body: UpdateChunkDto) {
    return this.chunkService.update(req.user.userId, chunkId, body);
  }
}
