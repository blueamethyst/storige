import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditorDesign } from './entities/editor-design.entity';
import { EditorDesignsService } from './editor-designs.service';
import { EditorDesignsController } from './editor-designs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EditorDesign])],
  controllers: [EditorDesignsController],
  providers: [EditorDesignsService],
  exports: [EditorDesignsService],
})
export class EditorDesignsModule {}
