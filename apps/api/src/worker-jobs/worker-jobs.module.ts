import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WorkerJobsController } from './worker-jobs.controller';
import { WorkerJobsService } from './worker-jobs.service';
import { WorkerJob } from './entities/worker-job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkerJob]),
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
  ],
  controllers: [WorkerJobsController],
  providers: [WorkerJobsService],
  exports: [WorkerJobsService],
})
export class WorkerJobsModule {}
