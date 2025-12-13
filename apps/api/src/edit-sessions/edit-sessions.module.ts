import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditSessionsController } from './edit-sessions.controller';
import { EditSessionsService } from './edit-sessions.service';
import { EditSessionEntity } from './entities/edit-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EditSessionEntity])],
  controllers: [EditSessionsController],
  providers: [EditSessionsService],
  exports: [EditSessionsService],
})
export class EditSessionsModule {}
