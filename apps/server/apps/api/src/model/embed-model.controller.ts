/**
 * 当前用户的嵌入模型。密钥只以提示形式返回。
 */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@libs/auth';
import { CreateEmbedModelDto } from './dto/create-embed-model.dto.js';
import { UpdateEmbedModelDto } from './dto/update-embed-model.dto.js';
import { ModelService } from './model.service.js';

@Controller('embed-models')
@UseGuards(AuthGuard)
export class EmbedModelController {
  constructor(private readonly modelService: ModelService) {}

  @Get()
  /** GET /embed-models：列出当前用户的嵌入模型。 */
  list(@Req() req: Request) {
    return this.modelService.listEmbed(req.user.userId);
  }

  @Post()
  /** POST /embed-models：创建嵌入模型。 */
  create(@Req() req: Request, @Body() body: CreateEmbedModelDto) {
    return this.modelService.createEmbed(req.user.userId, body);
  }

  @Patch(':id')
  /** PATCH /embed-models/:id：更新嵌入模型。 */
  update(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateEmbedModelDto) {
    return this.modelService.updateEmbed(req.user.userId, id, body);
  }

  @Delete(':id')
  /** DELETE /embed-models/:id：删除嵌入模型。 */
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.modelService.removeEmbed(req.user.userId, id);
  }
}
