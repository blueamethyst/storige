import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WorkerJobsController } from './worker-jobs.controller';
import { WorkerJobsService } from './worker-jobs.service';
import { WorkerJob } from './entities/worker-job.entity';
import { FilesModule } from '../files/files.module';
import { WebhookModule } from '../webhook/webhook.module';
import { EditSessionEntity } from '../edit-sessions/entities/edit-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkerJob, EditSessionEntity]),
    BullModule.registerQueue(
      {
        name: 'pdf-validation',
      },
      {
        name: 'pdf-conversion',
      },
      {
        name: 'pdf-synthesis',
      },
    ),
    FilesModule,
    WebhookModule,
  ],
  controllers: [WorkerJobsController],
  providers: [WorkerJobsService],
  exports: [WorkerJobsService],
})
export class WorkerJobsModule {}
