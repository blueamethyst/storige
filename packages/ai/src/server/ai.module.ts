import { DynamicModule, Module, Type } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DataSource } from 'typeorm';

// Entities
import { TemplateFeatures } from './entities/template-features.entity';
import { UserPreference } from './entities/user-preference.entity';
import { AiGeneration } from './entities/ai-generation.entity';
import { UserInteraction } from './entities/user-interaction.entity';

// Providers
import { LlmService } from './providers/llm.service';
import { FluxImageService } from './providers/flux-image.service';

// Services
import { FeatureExtractionService } from './services/feature-extraction.service';
import { RecommendationService } from './services/recommendation.service';
import { GenerationService } from './services/generation.service';

// Processors
import { GenerationProcessor } from './processors/generation.processor';

// Controller
import { AiController } from './ai.controller';

export interface AiModuleOptions {
  /**
   * Template entity class from your app
   */
  templateEntity: Type<any>;
  /**
   * TemplateSet entity class from your app
   */
  templateSetEntity: Type<any>;
}

@Module({})
export class AiModule {
  /**
   * AI 모듈 등록
   *
   * @example
   * ```ts
   * import { AiModule } from '@storige/ai/server';
   * import { Template, TemplateSet } from './templates/entities';
   *
   * @Module({
   *   imports: [
   *     AiModule.forRoot({
   *       templateEntity: Template,
   *       templateSetEntity: TemplateSet,
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: AiModuleOptions): DynamicModule {
    return {
      module: AiModule,
      imports: [
        TypeOrmModule.forFeature([
          TemplateFeatures,
          UserPreference,
          AiGeneration,
          UserInteraction,
          options.templateEntity,
          options.templateSetEntity,
        ]),
        BullModule.registerQueue({
          name: 'ai-generation',
          defaultJobOptions: {
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        }),
      ],
      controllers: [AiController],
      providers: [
        // Options injection
        {
          provide: 'AI_MODULE_OPTIONS',
          useValue: options,
        },
        // Dynamic entity repositories
        {
          provide: 'TEMPLATE_REPOSITORY',
          useFactory: (dataSource: DataSource) => dataSource.getRepository(options.templateEntity),
          inject: [DataSource],
        },
        {
          provide: 'TEMPLATE_SET_REPOSITORY',
          useFactory: (dataSource: DataSource) => dataSource.getRepository(options.templateSetEntity),
          inject: [DataSource],
        },
        // Providers (외부 API 연동)
        LlmService,
        FluxImageService,

        // Services (비즈니스 로직)
        FeatureExtractionService,
        RecommendationService,
        GenerationService,

        // Processors (Queue 처리)
        GenerationProcessor,
      ],
      exports: [
        LlmService,
        FluxImageService,
        FeatureExtractionService,
        RecommendationService,
        GenerationService,
      ],
    };
  }
}
