// AI Module
export { AiModule } from './ai.module';
export { AiController } from './ai.controller';

// Entities
export { TemplateFeatures } from './entities/template-features.entity';
export { UserPreference } from './entities/user-preference.entity';
export { AiGeneration } from './entities/ai-generation.entity';
export { UserInteraction } from './entities/user-interaction.entity';

// Services
export { RecommendationService } from './services/recommendation.service';
export { GenerationService } from './services/generation.service';
export { FeatureExtractionService } from './services/feature-extraction.service';

// Providers
export { LlmService } from './providers/llm.service';
export { FluxImageService } from './providers/flux-image.service';

// Processors
export { GenerationProcessor } from './processors/generation.processor';

// DTOs
export * from './dto/recommendation.dto';
export * from './dto/generation.dto';

// Re-export shared types
export * from '../shared';
