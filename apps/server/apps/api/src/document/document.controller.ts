/**
 * 文档上传登记、预览下载、解析进度。解析本身由 Worker 执行。
 */
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@libs/auth';
import { BatchDocumentStatusDto } from './dto/batch-document-status.dto.js';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto.js';
import { RegisterDocumentDto } from './dto/register-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DocumentService } from './document.service.js';

@Controller()
@UseGuards(AuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('documents/upload-url')
  /** POST /documents/upload-url：签发文件上传地址。 */
  createUploadUrl(@Req() req: Request, @Body() body: CreateUploadUrlDto) {
    return this.documentService.createUploadUrl(req.user.userId, body);
  }

  @Post('documents/batch-status')
  /** POST /documents/batch-status：批量查询文档解析进度。 */
  batchStatus(@Req() req: Request, @Body() body: BatchDocumentStatusDto) {
    return this.documentService.batchStatus(req.user.userId, body);
  }

  @Get('datasets/:datasetId/documents')
  /** GET /datasets/:datasetId/documents：列出知识库文档。 */
  list(@Req() req: Request, @Param('datasetId', ParseIntPipe) datasetId: number) {
    return this.documentService.list(req.user.userId, datasetId);
  }

  @Post('datasets/:datasetId/documents')
  /** POST /datasets/:datasetId/documents：登记已上传文档。 */
  register(
    @Req() req: Request,
    @Param('datasetId', ParseIntPipe) datasetId: number,
    @Body() body: RegisterDocumentDto,
  ) {
    return this.documentService.register(req.user.userId, datasetId, body);
  }

  @Get('documents/:documentId/preview')
  /** GET /documents/:documentId/preview：获取文档预览链接。 */
  preview(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.documentService.preview(req.user.userId, documentId);
  }

  @Get('documents/:documentId/download')
  /** GET /documents/:documentId/download：获取文档下载链接。 */
  download(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.documentService.download(req.user.userId, documentId);
  }

  @Get('documents/:documentId/progress')
  /** GET /documents/:documentId/progress：获取文档解析进度。 */
  progress(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.documentService.progress(req.user.userId, documentId);
  }

  @Post('documents/:documentId/parse')
  /** POST /documents/:documentId/parse：重新提交文档解析任务。 */
  parse(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.documentService.parse(req.user.userId, documentId);
  }

  @Post('documents/:documentId/stop')
  /** POST /documents/:documentId/stop：停止文档解析任务。 */
  stop(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.documentService.stop(req.user.userId, documentId);
  }

  @Get('documents/:documentId')
  /** GET /documents/:documentId：获取文档详情。 */
  detail(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.documentService.detail(req.user.userId, documentId);
  }

  @Put('documents/:documentId')
  /** PUT /documents/:documentId：更新文档启用状态。 */
  update(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number, @Body() body: UpdateDocumentDto) {
    return this.documentService.update(req.user.userId, documentId, body);
  }

  @Delete('documents/:documentId')
  /** DELETE /documents/:documentId：删除文档及其存储对象。 */
  remove(@Req() req: Request, @Param('documentId', ParseIntPipe) documentId: number) {
    return this.documentService.remove(req.user.userId, documentId);
  }
}
