import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Template } from './entities/template.entity';
import { Category } from './entities/category.entity';
import { TemplateSet, TemplateSetItem } from './entities/template-set.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      Category,
      TemplateSet,
      TemplateSetItem,
    ]),
  ],
  controllers: [TemplatesController, CategoriesController],
  providers: [TemplatesService, CategoriesService],
  exports: [TemplatesService, CategoriesService],
})
export class TemplatesModule {}
