import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecommendationService } from './services/recommendation.service';
import { GenerationService } from './services/generation.service';
import { FeatureExtractionService } from './services/feature-extraction.service';
import {
  RecommendationRequestDto,
  RecommendationResponseDto,
  FeedbackRequestDto,
  UserPreferenceInputDto,
} from './dto/recommendation.dto';
import {
  GenerationRequestDto,
  GenerationStartResponseDto,
  GenerationStatusDto,
  GenerationAcceptDto,
  GenerationRejectDto,
  GenerationHistoryItemDto,
} from './dto/generation.dto';

/**
 * AI Controller
 *
 * Note: 이 컨트롤러는 guards가 적용되지 않은 상태입니다.
 * 사용하는 앱에서 필요에 따라 guards를 적용해야 합니다.
 *
 * @example
 * ```ts
 * // app.module.ts에서 guards 적용
 * import { APP_GUARD } from '@nestjs/core';
 * import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
 *
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_GUARD,
 *       useClass: JwtAuthGuard,
 *     },
 *   ],
 * })
 * ```
 */
@ApiTags('AI')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  constructor(
    private recommendationService: RecommendationService,
    private generationService: GenerationService,
    private featureExtractionService: FeatureExtractionService,
  ) {}

  // ==================== 추천 API ====================

  @Post('recommendations')
  @ApiOperation({ summary: '개인화 템플릿 추천 조회' })
  @ApiResponse({
    status: 200,
    description: '추천 결과',
    type: RecommendationResponseDto,
  })
  async getRecommendations(
    @Request() req: { user?: { sub?: string } },
    @Body() request: RecommendationRequestDto,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.recommend(req.user?.sub, request);
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '사용자 선호도 설정' })
  @ApiResponse({ status: 200, description: '선호도 저장 완료' })
  async setPreferences(
    @Request() req: { user?: { sub?: string } },
    @Body() preferences: UserPreferenceInputDto,
  ): Promise<{ success: boolean }> {
    await this.recommendationService.recommend(req.user?.sub, { preferences });
    return { success: true };
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '템플릿 피드백 제출' })
  @ApiResponse({ status: 200, description: '피드백 저장 완료' })
  async submitFeedback(
    @Request() req: { user?: { sub?: string } },
    @Body() feedback: FeedbackRequestDto,
  ): Promise<{ success: boolean }> {
    await this.recommendationService.saveFeedback(req.user?.sub, feedback);
    return { success: true };
  }

  // ==================== 생성 API ====================

  @Post('generate')
  @ApiOperation({ summary: 'AI 템플릿 생성 시작' })
  @ApiResponse({
    status: 201,
    description: '생성 작업 시작',
    type: GenerationStartResponseDto,
  })
  async startGeneration(
    @Request() req: { user?: { sub?: string } },
    @Body() request: GenerationRequestDto,
  ): Promise<GenerationStartResponseDto> {
    return this.generationService.startGeneration(req.user?.sub, request);
  }

  @Get('generate/:id')
  @ApiOperation({ summary: '생성 상태 조회' })
  @ApiParam({ name: 'id', description: '생성 작업 ID' })
  @ApiResponse({
    status: 200,
    description: '생성 상태',
    type: GenerationStatusDto,
  })
  async getGenerationStatus(
    @Param('id') id: string,
  ): Promise<GenerationStatusDto> {
    return this.generationService.getGenerationStatus(id);
  }

  @Post('generate/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '생성 결과 수락' })
  @ApiParam({ name: 'id', description: '생성 작업 ID' })
  @ApiResponse({ status: 200, description: '수락 완료' })
  async acceptGeneration(
    @Request() req: { user?: { sub?: string } },
    @Param('id') id: string,
    @Body() accept: GenerationAcceptDto,
  ): Promise<{ templateSetId: string }> {
    const templateSet = await this.generationService.acceptGeneration(
      id,
      req.user?.sub,
      accept,
    );
    return { templateSetId: templateSet.id };
  }

  @Post('generate/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '생성 결과 거절' })
  @ApiParam({ name: 'id', description: '생성 작업 ID' })
  @ApiResponse({ status: 200, description: '거절 완료' })
  async rejectGeneration(
    @Request() req: { user?: { sub?: string } },
    @Param('id') id: string,
    @Body() reject: GenerationRejectDto,
  ): Promise<{ success: boolean }> {
    await this.generationService.rejectGeneration(id, req.user?.sub, reject);
    return { success: true };
  }

  @Get('generate/history')
  @ApiOperation({ summary: '생성 이력 조회' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: '생성 이력',
    type: [GenerationHistoryItemDto],
  })
  async getGenerationHistory(
    @Request() req: { user?: { sub?: string } },
    @Query('limit') limit?: number,
  ): Promise<GenerationHistoryItemDto[]> {
    const generations = await this.generationService.getGenerationHistory(
      req.user?.sub,
      limit,
    );

    return generations.map((g) => ({
      id: g.id,
      prompt: g.prompt,
      status: g.status,
      thumbnailUrl: g.thumbnailUrl || undefined,
      templateSetId: g.generatedTemplateSetId || undefined,
      createdAt: g.createdAt,
      userAccepted: g.userAccepted || undefined,
    }));
  }

  // ==================== 관리자 API ====================

  @Post('admin/extract-features')
  @ApiOperation({ summary: '모든 템플릿 특성 추출 (관리자)' })
  @ApiResponse({ status: 200, description: '추출 결과' })
  async extractAllFeatures(): Promise<{ processed: number; failed: number }> {
    return this.featureExtractionService.extractAllTemplates();
  }

  @Post('admin/extract-features/:templateId')
  @ApiOperation({ summary: '단일 템플릿 특성 추출 (관리자)' })
  @ApiParam({ name: 'templateId', description: '템플릿 ID' })
  @ApiResponse({ status: 200, description: '추출된 특성' })
  async extractTemplateFeatures(
    @Param('templateId') templateId: string,
  ): Promise<unknown> {
    return this.featureExtractionService.extractAndSave(templateId);
  }
}
