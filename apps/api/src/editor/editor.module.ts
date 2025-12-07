import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditorController } from './editor.controller';
import { EditorService } from './editor.service';
import { EditSession, EditHistory } from './entities/edit-session.entity';
import { TemplateSet } from '../templates/entities/template-set.entity';
import { Template } from '../templates/entities/template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EditSession,
      EditHistory,
      TemplateSet,
      Template,
    ]),
  ],
  controllers: [EditorController],
  providers: [EditorService],
  exports: [EditorService],
})
export class EditorModule {}
