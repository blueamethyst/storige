import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditSessionsController } from './edit-sessions.controller';
import { EditSessionsService } from './edit-sessions.service';
import { EditSessionEntity } from './entities/edit-session.entity';
import { WorkerJobsModule } from '../worker-jobs/worker-jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EditSessionEntity]),
    forwardRef(() => WorkerJobsModule),
  ],
  controllers: [EditSessionsController],
  providers: [EditSessionsService],
  exports: [EditSessionsService],
})
export class EditSessionsModule {}
