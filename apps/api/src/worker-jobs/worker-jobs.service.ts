import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { WorkerJob } from './entities/worker-job.entity';
import { WorkerJobType, WorkerJobStatus } from '@storige/types';
import {
  CreateValidationJobDto,
  CreateConversionJobDto,
  CreateSynthesisJobDto,
  UpdateJobStatusDto,
} from './dto/worker-job.dto';

@Injectable()
export class WorkerJobsService {
  constructor(
    @InjectRepository(WorkerJob)
    private workerJobRepository: Repository<WorkerJob>,
    @InjectQueue('pdf-validation') private validationQueue: Queue,
    @InjectQueue('pdf-conversion') private conversionQueue: Queue,
    @InjectQueue('pdf-synthesis') private synthesisQueue: Queue,
  ) {}

  // ============================================================================
  // Validation Jobs
  // ============================================================================

  async createValidationJob(createValidationJobDto: CreateValidationJobDto): Promise<WorkerJob> {
    // Create job record in database
    const job = this.workerJobRepository.create({
      jobType: WorkerJobType.VALIDATE,
      status: WorkerJobStatus.PENDING,
      inputFileUrl: createValidationJobDto.fileUrl,
      options: {
        fileType: createValidationJobDto.fileType,
        orderOptions: createValidationJobDto.orderOptions,
      },
    });

    const savedJob = await this.workerJobRepository.save(job);

    // Add to Bull queue
    await this.validationQueue.add('validate-pdf', {
      jobId: savedJob.id,
      fileUrl: createValidationJobDto.fileUrl,
      fileType: createValidationJobDto.fileType,
      orderOptions: createValidationJobDto.orderOptions,
    });

    return savedJob;
  }

  // ============================================================================
  // Conversion Jobs
  // ============================================================================

  async createConversionJob(createConversionJobDto: CreateConversionJobDto): Promise<WorkerJob> {
    const job = this.workerJobRepository.create({
      jobType: WorkerJobType.CONVERT,
      status: WorkerJobStatus.PENDING,
      inputFileUrl: createConversionJobDto.fileUrl,
      options: createConversionJobDto.convertOptions,
    });

    const savedJob = await this.workerJobRepository.save(job);

    await this.conversionQueue.add('convert-pdf', {
      jobId: savedJob.id,
      fileUrl: createConversionJobDto.fileUrl,
      convertOptions: createConversionJobDto.convertOptions,
    });

    return savedJob;
  }

  // ============================================================================
  // Synthesis Jobs
  // ============================================================================

  async createSynthesisJob(createSynthesisJobDto: CreateSynthesisJobDto): Promise<WorkerJob> {
    const job = this.workerJobRepository.create({
      jobType: WorkerJobType.SYNTHESIZE,
      status: WorkerJobStatus.PENDING,
      inputFileUrl: createSynthesisJobDto.coverUrl,
      options: {
        coverUrl: createSynthesisJobDto.coverUrl,
        contentUrl: createSynthesisJobDto.contentUrl,
        spineWidth: createSynthesisJobDto.spineWidth,
      },
    });

    const savedJob = await this.workerJobRepository.save(job);

    await this.synthesisQueue.add('synthesize-pdf', {
      jobId: savedJob.id,
      coverUrl: createSynthesisJobDto.coverUrl,
      contentUrl: createSynthesisJobDto.contentUrl,
      spineWidth: createSynthesisJobDto.spineWidth,
    });

    return savedJob;
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  async findAll(status?: WorkerJobStatus, jobType?: WorkerJobType): Promise<WorkerJob[]> {
    const query = this.workerJobRepository.createQueryBuilder('job');

    if (status) {
      query.andWhere('job.status = :status', { status });
    }

    if (jobType) {
      query.andWhere('job.jobType = :jobType', { jobType });
    }

    return await query.orderBy('job.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<WorkerJob> {
    const job = await this.workerJobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Worker job with ID ${id} not found`);
    }

    return job;
  }

  async updateJobStatus(id: string, updateJobStatusDto: UpdateJobStatusDto): Promise<WorkerJob> {
    const job = await this.findOne(id);

    Object.assign(job, updateJobStatusDto);

    if (
      updateJobStatusDto.status === WorkerJobStatus.COMPLETED ||
      updateJobStatusDto.status === WorkerJobStatus.FAILED
    ) {
      job.completedAt = new Date();
    }

    return await this.workerJobRepository.save(job);
  }

  async getJobStats(): Promise<any> {
    const stats = await this.workerJobRepository
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('job.jobType', 'jobType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .addGroupBy('job.jobType')
      .getRawMany();

    return stats;
  }
}
