// Shared types (always available)
export * from './shared';

// Re-export server module for easier access
// Full server exports are also available via '@storige/ai/server'
export { AiModule } from './server/ai.module';
export type { AiModuleOptions } from './server/ai.module';

// Client exports are available via '@storige/ai/client'
