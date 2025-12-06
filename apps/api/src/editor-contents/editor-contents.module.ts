import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditorContent } from './entities/editor-content.entity';
import { EditorContentsService } from './editor-contents.service';
import { EditorContentsController } from './editor-contents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EditorContent])],
  controllers: [EditorContentsController],
  providers: [EditorContentsService],
  exports: [EditorContentsService],
})
export class EditorContentsModule {}
