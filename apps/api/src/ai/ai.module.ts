import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import from @storige/ai package (main export)
import { AiModule as AiPackageModule } from '@storige/ai';

// App-specific entities
import { Template } from '../templates/entities/template.entity';
import { TemplateSet } from '../templates/entities/template-set.entity';

/**
 * AI Module wrapper for the application
 * Uses @storige/ai package with app-specific entity providers
 */
@Module({
  imports: [
    // Import TypeORM repositories for app entities
    TypeOrmModule.forFeature([Template, TemplateSet]),

    // Import the AI module from the package with configuration
    AiPackageModule.forRoot({
      templateEntity: Template,
      templateSetEntity: TemplateSet,
    }),
  ],
  exports: [AiPackageModule],
})
export class AiModule {}
