/**
 * 当前用户的视觉模型。密钥只以提示形式返回。
 */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@libs/auth';
import { CreateVisionModelDto } from './dto/create-vision-model.dto.js';
import { UpdateVisionModelDto } from './dto/update-vision-model.dto.js';
import { ModelService } from './model.service.js';

@Controller('vision-models')
@UseGuards(AuthGuard)
export class VisionModelController {
  constructor(private readonly modelService: ModelService) {}

  @Get()
  /** GET /vision-models：列出当前用户的视觉模型。 */
  list(@Req() req: Request) {
    return this.modelService.listVision(req.user.userId);
  }

  @Post()
  /** POST /vision-models：创建视觉模型。 */
  create(@Req() req: Request, @Body() body: CreateVisionModelDto) {
    return this.modelService.createVision(req.user.userId, body);
  }

  @Patch(':id')
  /** PATCH /vision-models/:id：更新视觉模型。 */
  update(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateVisionModelDto) {
    return this.modelService.updateVision(req.user.userId, id, body);
  }

  @Delete(':id')
  /** DELETE /vision-models/:id：删除视觉模型。 */
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.modelService.removeVision(req.user.userId, id);
  }
}
