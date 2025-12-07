import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplateSetsService } from './template-sets.service';
import { TemplateSetsController } from './template-sets.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Template } from './entities/template.entity';
import { Category } from './entities/category.entity';
import { TemplateSet, TemplateSetItem } from './entities/template-set.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      Category,
      TemplateSet,
      TemplateSetItem,
      Product,
    ]),
  ],
  controllers: [
    TemplatesController,
    TemplateSetsController,
    CategoriesController,
  ],
  providers: [
    TemplatesService,
    TemplateSetsService,
    CategoriesService,
  ],
  exports: [
    TemplatesService,
    TemplateSetsService,
    CategoriesService,
  ],
})
export class TemplatesModule {}
