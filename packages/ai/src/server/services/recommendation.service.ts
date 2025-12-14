import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateFeatures } from '../entities/template-features.entity';
import { UserPreference, ColorPalette } from '../entities/user-preference.entity';
import { UserInteraction, InteractionType, FeedbackType } from '../entities/user-interaction.entity';
import {
  RecommendationRequestDto,
  UserPreferenceInputDto,
  RecommendationItemDto,
  RecommendationResponseDto,
  FeedbackRequestDto,
} from '../dto/recommendation.dto';
import { FeatureExtractionService } from './feature-extraction.service';

/**
 * TemplateSet 엔티티 인터페이스 (최소 필요 속성)
 */
interface TemplateSetEntity {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  type: string;
  width: number;
  height: number;
  isDeleted: boolean;
  categoryId?: string;
  templates?: Array<{ templateId: string; required: boolean }>;
}

/**
 * 추천 점수가 포함된 템플릿셋
 */
interface ScoredTemplateSet {
  templateSet: TemplateSetEntity;
  features: TemplateFeatures | null;
  score: number;
  reasons: string[];
}

/**
 * ML 기반 템플릿 추천 서비스
 */
@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @Inject('TEMPLATE_SET_REPOSITORY')
    private templateSetRepo: Repository<TemplateSetEntity>,
    @InjectRepository(TemplateFeatures)
    private templateFeaturesRepo: Repository<TemplateFeatures>,
    @InjectRepository(UserPreference)
    private userPreferenceRepo: Repository<UserPreference>,
    @InjectRepository(UserInteraction)
    private userInteractionRepo: Repository<UserInteraction>,
    private featureExtractionService: FeatureExtractionService,
  ) {}

  /**
   * 개인화 추천 조회
   */
  async recommend(
    userId: string | undefined,
    request: RecommendationRequestDto,
  ): Promise<RecommendationResponseDto> {
    const limit = request.limit || 10;

    // 1. 사용자 선호도 벡터 가져오기 또는 생성
    let userVector: number[];
    let preferenceSource: 'input' | 'saved' | 'default';

    if (request.preferences) {
      // 입력된 선호도로 벡터 생성
      userVector = this.preferencesToVector(request.preferences);
      preferenceSource = 'input';

      // 선호도 저장 (비동기)
      if (userId) {
        this.saveUserPreferences(userId, request.preferences, userVector).catch(
          (err) => this.logger.error(`Failed to save preferences: ${err.message}`),
        );
      }
    } else if (userId) {
      // 저장된 선호도 사용
      const saved = await this.userPreferenceRepo.findOne({
        where: { userId },
      });

      if (saved?.preferenceVector) {
        userVector = saved.preferenceVector;
        preferenceSource = 'saved';
      } else {
        userVector = this.getDefaultVector();
        preferenceSource = 'default';
      }
    } else {
      userVector = this.getDefaultVector();
      preferenceSource = 'default';
    }

    // 2. 템플릿셋과 특성 조회
    const templateSets = await this.getTemplateSetsWithFeatures(
      request.templateType,
      request.categoryId,
    );

    // 3. 점수 계산
    const scored = await this.scoreTemplateSets(
      templateSets,
      userVector,
      request.preferences,
      userId,
    );

    // 4. 정렬 및 상위 N개 선택
    scored.sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, limit);

    // 5. 응답 생성
    const recommendations: RecommendationItemDto[] = topN.map((item) => ({
      templateSetId: item.templateSet.id,
      name: item.templateSet.name,
      thumbnailUrl: item.templateSet.thumbnailUrl,
      score: Math.round(item.score * 100) / 100,
      reasons: item.reasons,
      type: item.templateSet.type as 'book' | 'leaflet',
      width: item.templateSet.width,
      height: item.templateSet.height,
    }));

    return {
      recommendations,
      totalCount: scored.length,
      preferenceSource,
    };
  }

  /**
   * 피드백 저장
   */
  async saveFeedback(userId: string | undefined, feedback: FeedbackRequestDto): Promise<void> {
    if (!userId) {
      this.logger.debug('Skipping feedback save: no userId');
      return;
    }

    const interaction = this.userInteractionRepo.create({
      userId,
      templateSetId: feedback.templateSetId,
      interactionType: InteractionType.VIEW,
      source: feedback.context || 'recommendation',
      feedback: feedback.type as FeedbackType,
      recommendationRank: feedback.recommendationRank,
      feedbackComment: feedback.comment,
    });

    await this.userInteractionRepo.save(interaction);

    this.logger.debug(
      `Saved feedback: user=${userId}, template=${feedback.templateSetId}, type=${feedback.type}`,
    );

    // 선호도 업데이트 (피드백 기반 학습)
    await this.updatePreferencesFromFeedback(userId, feedback);
  }

  /**
   * 템플릿셋과 특성 조회
   */
  private async getTemplateSetsWithFeatures(
    templateType?: string,
    categoryId?: string,
  ): Promise<{ templateSet: TemplateSetEntity; features: TemplateFeatures | null }[]> {
    // 템플릿셋 조회
    const queryBuilder = this.templateSetRepo
      .createQueryBuilder('ts')
      .where('ts.isDeleted = :isDeleted', { isDeleted: false });

    if (templateType) {
      queryBuilder.andWhere('ts.type = :type', { type: templateType });
    }

    if (categoryId) {
      queryBuilder.andWhere('ts.categoryId = :categoryId', { categoryId });
    }

    const templateSets = await queryBuilder.getMany();

    // 각 템플릿셋의 첫 번째 템플릿 특성 조회
    const results = await Promise.all(
      templateSets.map(async (ts) => {
        let features: TemplateFeatures | null = null;

        if (ts.templates && ts.templates.length > 0) {
          const firstTemplateId = ts.templates[0].templateId;
          features = await this.templateFeaturesRepo.findOne({
            where: { templateId: firstTemplateId },
          });
        }

        return { templateSet: ts, features };
      }),
    );

    return results;
  }

  /**
   * 템플릿셋 점수 계산
   */
  private async scoreTemplateSets(
    templateSets: { templateSet: TemplateSetEntity; features: TemplateFeatures | null }[],
    userVector: number[],
    preferences: UserPreferenceInputDto | undefined,
    userId: string | undefined,
  ): Promise<ScoredTemplateSet[]> {
    // 사용자 상호작용 히스토리 조회
    let interactions: UserInteraction[] = [];
    if (userId) {
      interactions = await this.userInteractionRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    const likedTemplates = new Set(
      interactions
        .filter((i) => i.feedback === FeedbackType.LIKE)
        .map((i) => i.templateSetId),
    );

    const dislikedTemplates = new Set(
      interactions
        .filter((i) => i.feedback === FeedbackType.DISLIKE)
        .map((i) => i.templateSetId),
    );

    return templateSets.map(({ templateSet, features }) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. 벡터 유사도 (50% 가중치)
      if (features?.featureVector) {
        const similarity = this.cosineSimilarity(userVector, features.featureVector);
        score += similarity * 0.5;

        if (similarity > 0.8) {
          reasons.push('스타일 일치도 높음');
        }
      } else {
        score += 0.25; // 기본 점수
      }

      // 2. 명시적 선호도 매칭 (30% 가중치)
      if (preferences && features) {
        const prefScore = this.calculatePreferenceMatch(preferences, features);
        score += prefScore * 0.3;

        if (prefScore > 0.7) {
          if (preferences.preferredStyles?.length) {
            reasons.push('선호 스타일 일치');
          }
          if (preferences.preferredColors?.primary) {
            reasons.push('선호 색상 일치');
          }
        }
      }

      // 3. 인기도/통계 (20% 가중치)
      if (features) {
        const popularityScore = this.calculatePopularityScore(features);
        score += popularityScore * 0.2;

        if (features.selectionCount > 50) {
          reasons.push('인기 템플릿');
        }
        if (features.completionRate > 0.7) {
          reasons.push('완성률 높음');
        }
      }

      // 4. 피드백 반영
      if (likedTemplates.has(templateSet.id)) {
        score += 0.1;
        reasons.push('이전에 좋아요');
      }
      if (dislikedTemplates.has(templateSet.id)) {
        score -= 0.3;
      }

      // 기본 이유 추가
      if (reasons.length === 0) {
        reasons.push('추천 알고리즘 제안');
      }

      return {
        templateSet,
        features,
        score: Math.max(0, Math.min(1, score)),
        reasons,
      };
    });
  }

  /**
   * 선호도 매칭 점수 계산
   */
  private calculatePreferenceMatch(
    preferences: UserPreferenceInputDto,
    features: TemplateFeatures,
  ): number {
    let matches = 0;
    let total = 0;

    // 스타일 매칭
    if (preferences.preferredStyles?.length) {
      total++;
      if (
        features.styleLabels?.some((s) =>
          preferences.preferredStyles!.includes(s),
        )
      ) {
        matches++;
      }
      if (
        features.complexity &&
        preferences.preferredComplexity === features.complexity
      ) {
        matches += 0.5;
      }
    }

    // 색상 매칭
    if (preferences.preferredColors?.primary) {
      total++;
      if (
        features.dominantColors?.includes(preferences.preferredColors.primary)
      ) {
        matches++;
      }
    }

    // 분위기 매칭
    if (preferences.preferredMood && features.mood) {
      total++;
      if (preferences.preferredMood === features.mood) {
        matches++;
      }
    }

    // 업종 매칭
    if (preferences.industryCategory) {
      total++;
      if (features.industryLabels?.includes(preferences.industryCategory)) {
        matches++;
      }
    }

    return total > 0 ? matches / total : 0.5;
  }

  /**
   * 인기도 점수 계산
   */
  private calculatePopularityScore(features: TemplateFeatures): number {
    const selectionScore = Math.min(1, features.selectionCount / 100);
    const ratingScore = features.avgRating / 5;
    const completionScore = features.completionRate;

    return (selectionScore + ratingScore + completionScore) / 3;
  }

  /**
   * 코사인 유사도 계산
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * 선호도를 벡터로 변환
   */
  private preferencesToVector(preferences: UserPreferenceInputDto): number[] {
    const vector: number[] = new Array(128).fill(0);

    // 색상 선호도 인코딩 (32차원)
    if (preferences.preferredColors?.primary) {
      const rgb = this.hexToRgb(preferences.preferredColors.primary);
      if (rgb) {
        vector[0] = rgb.r / 255;
        vector[1] = rgb.g / 255;
        vector[2] = rgb.b / 255;
        vector[3] = 1;
      }
    }

    if (preferences.preferredColors?.secondary) {
      let idx = 4;
      for (const color of preferences.preferredColors.secondary.slice(0, 7)) {
        const rgb = this.hexToRgb(color);
        if (rgb) {
          vector[idx++] = rgb.r / 255;
          vector[idx++] = rgb.g / 255;
          vector[idx++] = rgb.b / 255;
          vector[idx++] = 1;
        }
      }
    }

    // 레이아웃 선호도 (복잡도로 추정) - 48-52
    const complexityMap: Record<string, number> = { minimal: 0, moderate: 1, complex: 2 };
    if (preferences.preferredComplexity) {
      vector[48 + complexityMap[preferences.preferredComplexity]] = 1;
    }

    // 분위기 선호도 - 52-56
    const moodMap: Record<string, number> = { professional: 0, casual: 1, playful: 2, elegant: 3 };
    if (preferences.preferredMood) {
      vector[52 + moodMap[preferences.preferredMood]] = 1;
    }

    return vector;
  }

  /**
   * 기본 벡터 반환
   */
  private getDefaultVector(): number[] {
    const vector = new Array(128).fill(0);
    // 기본값: moderate complexity, professional mood
    vector[49] = 1; // moderate
    vector[52] = 1; // professional
    return vector;
  }

  /**
   * 사용자 선호도 저장
   */
  private async saveUserPreferences(
    userId: string,
    preferences: UserPreferenceInputDto,
    vector: number[],
  ): Promise<void> {
    let userPref = await this.userPreferenceRepo.findOne({
      where: { userId },
    });

    if (!userPref) {
      userPref = this.userPreferenceRepo.create({ userId });
    }

    userPref.preferredStyles = preferences.preferredStyles || userPref.preferredStyles;
    userPref.preferredColors = preferences.preferredColors as ColorPalette || userPref.preferredColors;
    userPref.preferredFonts = preferences.preferredFonts || userPref.preferredFonts;
    userPref.industryCategory = preferences.industryCategory || userPref.industryCategory;
    userPref.usageContext = preferences.usageContext || userPref.usageContext;
    userPref.preferredComplexity = preferences.preferredComplexity || userPref.preferredComplexity;
    userPref.preferredMood = preferences.preferredMood || userPref.preferredMood;
    userPref.preferenceVector = vector;

    await this.userPreferenceRepo.save(userPref);
  }

  /**
   * 피드백 기반 선호도 업데이트
   */
  private async updatePreferencesFromFeedback(
    userId: string,
    feedback: FeedbackRequestDto,
  ): Promise<void> {
    // 좋아요한 템플릿의 특성을 선호도에 반영
    if (feedback.type === 'like') {
      // 템플릿셋의 첫 번째 템플릿 특성 조회
      const templateSet = await this.templateSetRepo.findOne({
        where: { id: feedback.templateSetId },
      });

      if (templateSet?.templates?.[0]) {
        const features = await this.templateFeaturesRepo.findOne({
          where: { templateId: templateSet.templates[0].templateId },
        });

        if (features?.featureVector) {
          const userPref = await this.userPreferenceRepo.findOne({
            where: { userId },
          });

          if (userPref?.preferenceVector) {
            // 기존 벡터와 새 벡터를 가중 평균
            const alpha = 0.1; // 새 피드백의 영향도
            const updatedVector = userPref.preferenceVector.map(
              (v, i) => v * (1 - alpha) + features.featureVector[i] * alpha,
            );

            userPref.preferenceVector = updatedVector;
            await this.userPreferenceRepo.save(userPref);
          }
        }
      }
    }
  }

  /**
   * HEX to RGB 변환
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (!hex || !hex.startsWith('#')) return null;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}
