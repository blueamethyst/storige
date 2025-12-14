import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplateSetsService } from './template-sets.service';
import { TemplateSetsController } from './template-sets.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { ProductTemplateSetsService } from './product-template-sets.service';
import { ProductTemplateSetsController } from './product-template-sets.controller';
import { Template } from './entities/template.entity';
import { Category } from './entities/category.entity';
import { TemplateSet, TemplateSetItem } from './entities/template-set.entity';
import { ProductTemplateSet } from './entities/product-template-set.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      Category,
      TemplateSet,
      TemplateSetItem,
      ProductTemplateSet,
      Product,
    ]),
  ],
  controllers: [
    TemplatesController,
    TemplateSetsController,
    CategoriesController,
    ProductTemplateSetsController,
  ],
  providers: [
    TemplatesService,
    TemplateSetsService,
    CategoriesService,
    ProductTemplateSetsService,
  ],
  exports: [
    TemplatesService,
    TemplateSetsService,
    CategoriesService,
    ProductTemplateSetsService,
  ],
})
export class TemplatesModule {}
