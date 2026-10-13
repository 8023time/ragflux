/**
 * 连通性测试，以及读取配置中的默认嵌入、视觉模型标识。
 * 测试成功即可，不写 t_embed_model 或 t_vision_model。
 */
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@libs/auth';
import { TestEmbedModelDto } from './dto/test-embed-model.dto.js';
import { TestVisionModelDto } from './dto/test-vision-model.dto.js';
import { ModelService } from './model.service.js';

@Controller('models')
@UseGuards(AuthGuard)
export class ModelTestController {
  constructor(private readonly modelService: ModelService) {}

  @Get('defaults')
  /** GET /models/defaults：返回配置中的默认模型标识。 */
  defaults() {
    return this.modelService.defaults();
  }

  @Post('test-embed')
  /** POST /models/test-embed：测试嵌入模型连通性且不写库。 */
  testEmbed(@Body() body: TestEmbedModelDto) {
    return this.modelService.testEmbed(body);
  }

  @Post('test-vision')
  /** POST /models/test-vision：测试视觉模型连通性且不写库。 */
  testVision(@Body() body: TestVisionModelDto) {
    return this.modelService.testVision(body);
  }
}
