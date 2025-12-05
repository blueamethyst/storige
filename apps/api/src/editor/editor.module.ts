import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditorController } from './editor.controller';
import { EditorService } from './editor.service';
import { EditSession } from './entities/edit-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EditSession])],
  controllers: [EditorController],
  providers: [EditorService],
  exports: [EditorService],
})
export class EditorModule {}
