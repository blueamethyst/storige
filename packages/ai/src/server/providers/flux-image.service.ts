import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';

/**
 * 이미지 생성 파라미터
 */
export interface ImageGenerateParams {
  prompt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  outputFormat?: 'webp' | 'jpg' | 'png';
  outputQuality?: number;
  negativePrompt?: string;
}

/**
 * 이미지 생성 결과
 */
export interface ImageGenerateResult {
  url: string;
  width: number;
  height: number;
  processingTimeMs: number;
}

/**
 * FLUX 이미지 생성 서비스
 * Replicate API를 통한 FLUX.1 Pro 모델 사용
 */
@Injectable()
export class FluxImageService {
  private readonly logger = new Logger(FluxImageService.name);
  private client: Replicate;
  private readonly model: string;

  // FLUX 모델 ID (Replicate)
  private static readonly FLUX_PRO_MODEL = 'black-forest-labs/flux-1.1-pro';
  private static readonly FLUX_SCHNELL_MODEL = 'black-forest-labs/flux-schnell';

  constructor(private configService: ConfigService) {
    const apiToken = this.configService.get<string>('REPLICATE_API_TOKEN');

    if (!apiToken) {
      this.logger.warn(
        'REPLICATE_API_TOKEN is not set. Image generation will not work.',
      );
    }

    this.client = new Replicate({
      auth: apiToken || 'dummy-token-for-init',
    });

    // 기본 모델 선택 (Pro 또는 Schnell)
    const useSchnell = this.configService.get<boolean>('FLUX_USE_SCHNELL', false);
    this.model = useSchnell
      ? FluxImageService.FLUX_SCHNELL_MODEL
      : FluxImageService.FLUX_PRO_MODEL;

    this.logger.log(`FLUX Image Service initialized with model: ${this.model}`);
  }

  /**
   * API가 설정되어 있는지 확인
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('REPLICATE_API_TOKEN');
  }

  /**
   * 단일 이미지 생성
   */
  async generate(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('REPLICATE_API_TOKEN is not configured');
    }

    const startTime = Date.now();

    // 기본값 설정
    const width = params.width || 1024;
    const height = params.height || 1024;
    const aspectRatio = params.aspectRatio || this.calculateAspectRatio(width, height);

    this.logger.debug(
      `Generating image - prompt: "${params.prompt.substring(0, 50)}...", size: ${width}x${height}`,
    );

    try {
      const input: Record<string, any> = {
        prompt: this.enhancePrompt(params.prompt),
        aspect_ratio: aspectRatio,
        output_format: params.outputFormat || 'webp',
        output_quality: params.outputQuality || 90,
        safety_tolerance: 2,
        prompt_upsampling: true,
      };

      // FLUX Pro 전용 옵션
      if (this.model === FluxImageService.FLUX_PRO_MODEL) {
        input.num_inference_steps = params.numInferenceSteps || 28;
        input.guidance_scale = params.guidanceScale || 3.5;
      }

      const output = await this.client.run(this.model as `${string}/${string}`, {
        input,
      });

      const processingTimeMs = Date.now() - startTime;

      // output은 URL 문자열 또는 URL 배열일 수 있음
      const imageUrl = Array.isArray(output) ? output[0] : String(output);

      this.logger.debug(
        `Image generated successfully in ${processingTimeMs}ms`,
      );

      return {
        url: imageUrl,
        width,
        height,
        processingTimeMs,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Image generation failed: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 여러 이미지 동시 생성
   */
  async generateBatch(
    prompts: ImageGenerateParams[],
    concurrency: number = 3,
  ): Promise<ImageGenerateResult[]> {
    const results: ImageGenerateResult[] = [];

    // 동시 요청 수 제한하여 배치 처리
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(async (params) => {
          try {
            return await this.generate(params);
          } catch (error) {
            this.logger.error(
              `Batch image generation failed for prompt: ${params.prompt.substring(0, 30)}...`,
            );
            // 실패 시 placeholder 반환
            return {
              url: '',
              width: params.width || 1024,
              height: params.height || 1024,
              processingTimeMs: 0,
            };
          }
        }),
      );

      results.push(...batchResults);

      // Rate limiting을 위한 짧은 대기 (선택적)
      if (i + concurrency < prompts.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * 템플릿용 이미지 생성 (스타일 강화)
   */
  async generateForTemplate(params: {
    description: string;
    style: string;
    colorScheme: string;
    width?: number;
    height?: number;
  }): Promise<ImageGenerateResult> {
    const enhancedPrompt = this.buildTemplatePrompt(params);

    return this.generate({
      prompt: enhancedPrompt,
      width: params.width,
      height: params.height,
      outputFormat: 'webp',
      outputQuality: 95,
    });
  }

  /**
   * 템플릿용 프롬프트 생성
   */
  private buildTemplatePrompt(params: {
    description: string;
    style: string;
    colorScheme: string;
  }): string {
    const styleDescriptions: Record<string, string> = {
      minimal: 'minimalist, clean, simple, lots of white space, modern',
      modern: 'contemporary, sleek, professional, geometric shapes',
      elegant: 'sophisticated, luxurious, refined, graceful, premium',
      playful: 'fun, colorful, dynamic, creative, energetic',
      professional: 'corporate, business, formal, trustworthy, reliable',
    };

    const styleDesc = styleDescriptions[params.style] || params.style;

    return `${params.description}, ${styleDesc} style, ${params.colorScheme} color palette, high quality print design, professional graphic design, clean composition, suitable for commercial printing`;
  }

  /**
   * 프롬프트 개선
   */
  private enhancePrompt(prompt: string): string {
    // 기본 품질 향상 태그 추가
    const qualityTags = [
      'high quality',
      'professional',
      'detailed',
      'clean design',
    ];

    // 이미 포함된 태그 제외
    const tagsToAdd = qualityTags.filter(
      (tag) => !prompt.toLowerCase().includes(tag.toLowerCase()),
    );

    if (tagsToAdd.length > 0) {
      return `${prompt}, ${tagsToAdd.join(', ')}`;
    }

    return prompt;
  }

  /**
   * 가로세로 비율 계산
   */
  private calculateAspectRatio(width: number, height: number): string {
    // FLUX에서 지원하는 비율들
    const supportedRatios = [
      { ratio: '1:1', value: 1 },
      { ratio: '16:9', value: 16 / 9 },
      { ratio: '9:16', value: 9 / 16 },
      { ratio: '4:3', value: 4 / 3 },
      { ratio: '3:4', value: 3 / 4 },
      { ratio: '3:2', value: 3 / 2 },
      { ratio: '2:3', value: 2 / 3 },
    ];

    const targetRatio = width / height;

    // 가장 가까운 비율 찾기
    let closest = supportedRatios[0];
    let minDiff = Math.abs(targetRatio - closest.value);

    for (const r of supportedRatios) {
      const diff = Math.abs(targetRatio - r.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = r;
      }
    }

    return closest.ratio;
  }

  /**
   * 비용 계산 (대략적인 추정)
   */
  calculateCost(imageCount: number, useSchnell: boolean = false): number {
    // Replicate 가격 기준 (2024)
    // FLUX Pro: ~$0.05/image
    // FLUX Schnell: ~$0.003/image
    const costPerImage = useSchnell ? 0.003 : 0.05;
    return imageCount * costPerImage;
  }

  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
