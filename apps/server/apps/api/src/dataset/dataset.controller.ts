import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@libs/auth';
import { DatasetService } from './dataset.service.js';
import { CreateDatasetDto } from './dto/create-dataset.dto.js';
import { DeleteDatasetDto } from './dto/delete-dataset.dto.js';
import { ListDatasetDto } from './dto/list-dataset.dto.js';
import { UpdateDatasetDto } from './dto/update-dataset.dto.js';

@Controller('datasets')
@UseGuards(AuthGuard)
export class DatasetController {
  constructor(private readonly datasetService: DatasetService) {}

  @Get()
  /** GET /datasets：列出当前用户的知识库。 */
  list(@Req() req: Request, @Query() _query: ListDatasetDto) {
    return this.datasetService.list(req.user.userId);
  }

  @Post()
  /** POST /datasets：创建知识库。 */
  create(@Req() req: Request, @Body() body: CreateDatasetDto) {
    return this.datasetService.create(req.user.userId, body);
  }

  @Put(':datasetId')
  /** PUT /datasets/:datasetId：更新知识库配置。 */
  update(@Req() req: Request, @Param('datasetId', ParseIntPipe) datasetId: number, @Body() body: UpdateDatasetDto) {
    return this.datasetService.update(req.user.userId, datasetId, body);
  }

  @Delete(':datasetId')
  /** DELETE /datasets/:datasetId：删除知识库。 */
  remove(@Req() req: Request, @Param() params: DeleteDatasetDto) {
    return this.datasetService.remove(req.user.userId, params.datasetId);
  }
}
