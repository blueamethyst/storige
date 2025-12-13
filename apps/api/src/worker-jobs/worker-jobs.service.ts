import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { FilesService } from '../files/files.service';

@Injectable()
export class WorkerJobsService {
  constructor(
    @InjectRepository(WorkerJob)
    private workerJobRepository: Repository<WorkerJob>,
    @InjectQueue('pdf-validation') private validationQueue: Queue,
    @InjectQueue('pdf-conversion') private conversionQueue: Queue,
    @InjectQueue('pdf-synthesis') private synthesisQueue: Queue,
    private filesService: FilesService,
  ) {}

  // ============================================================================
  // Validation Jobs
  // ============================================================================

  async createValidationJob(createValidationJobDto: CreateValidationJobDto): Promise<WorkerJob> {
    // fileId 또는 fileUrl 중 하나는 필수
    if (!createValidationJobDto.fileId && !createValidationJobDto.fileUrl) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'fileId 또는 fileUrl 중 하나를 제공해야 합니다.',
      });
    }

    // fileId로 파일 경로 조회
    let fileUrl = createValidationJobDto.fileUrl;
    let fileId = createValidationJobDto.fileId;

    if (fileId) {
      const file = await this.filesService.findById(fileId);
      fileUrl = file.filePath; // 로컬 파일 경로 사용
    }

    // Create job record in database
    const job = this.workerJobRepository.create({
      jobType: WorkerJobType.VALIDATE,
      status: WorkerJobStatus.PENDING,
      fileId,
      inputFileUrl: fileUrl,
      options: {
        fileType: createValidationJobDto.fileType,
        orderOptions: createValidationJobDto.orderOptions,
      },
    });

    const savedJob = await this.workerJobRepository.save(job);

    // Add to Bull queue
    await this.validationQueue.add('validate-pdf', {
      jobId: savedJob.id,
      fileId,
      fileUrl,
      fileType: createValidationJobDto.fileType,
      orderOptions: createValidationJobDto.orderOptions,
    });

    return savedJob;
  }

  // ============================================================================
  // Conversion Jobs
  // ============================================================================

  async createConversionJob(createConversionJobDto: CreateConversionJobDto): Promise<WorkerJob> {
    // fileId 또는 fileUrl 중 하나는 필수
    if (!createConversionJobDto.fileId && !createConversionJobDto.fileUrl) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'fileId 또는 fileUrl 중 하나를 제공해야 합니다.',
      });
    }

    // fileId로 파일 경로 조회
    let fileUrl = createConversionJobDto.fileUrl;
    let fileId = createConversionJobDto.fileId;

    if (fileId) {
      const file = await this.filesService.findById(fileId);
      fileUrl = file.filePath;
    }

    const job = this.workerJobRepository.create({
      jobType: WorkerJobType.CONVERT,
      status: WorkerJobStatus.PENDING,
      fileId,
      inputFileUrl: fileUrl,
      options: createConversionJobDto.convertOptions,
    });

    const savedJob = await this.workerJobRepository.save(job);

    await this.conversionQueue.add('convert-pdf', {
      jobId: savedJob.id,
      fileId,
      fileUrl,
      convertOptions: createConversionJobDto.convertOptions,
    });

    return savedJob;
  }

  // ============================================================================
  // Synthesis Jobs
  // ============================================================================

  async createSynthesisJob(createSynthesisJobDto: CreateSynthesisJobDto): Promise<WorkerJob> {
    // 표지: coverFileId 또는 coverUrl 중 하나는 필수
    if (!createSynthesisJobDto.coverFileId && !createSynthesisJobDto.coverUrl) {
      throw new BadRequestException({
        code: 'COVER_FILE_REQUIRED',
        message: 'coverFileId 또는 coverUrl 중 하나를 제공해야 합니다.',
      });
    }

    // 내지: contentFileId 또는 contentUrl 중 하나는 필수
    if (!createSynthesisJobDto.contentFileId && !createSynthesisJobDto.contentUrl) {
      throw new BadRequestException({
        code: 'CONTENT_FILE_REQUIRED',
        message: 'contentFileId 또는 contentUrl 중 하나를 제공해야 합니다.',
      });
    }

    // 파일 경로 조회
    let coverUrl = createSynthesisJobDto.coverUrl;
    let contentUrl = createSynthesisJobDto.contentUrl;
    const coverFileId = createSynthesisJobDto.coverFileId;
    const contentFileId = createSynthesisJobDto.contentFileId;

    if (coverFileId) {
      const coverFile = await this.filesService.findById(coverFileId);
      coverUrl = coverFile.filePath;
    }

    if (contentFileId) {
      const contentFile = await this.filesService.findById(contentFileId);
      contentUrl = contentFile.filePath;
    }

    const job = this.workerJobRepository.create({
      jobType: WorkerJobType.SYNTHESIZE,
      status: WorkerJobStatus.PENDING,
      fileId: coverFileId, // 대표 파일로 표지 사용
      inputFileUrl: coverUrl,
      options: {
        coverFileId,
        contentFileId,
        coverUrl,
        contentUrl,
        spineWidth: createSynthesisJobDto.spineWidth,
      },
    });

    const savedJob = await this.workerJobRepository.save(job);

    await this.synthesisQueue.add('synthesize-pdf', {
      jobId: savedJob.id,
      coverFileId,
      contentFileId,
      coverUrl,
      contentUrl,
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
