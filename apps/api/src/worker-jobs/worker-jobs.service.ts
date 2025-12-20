import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
import {
  CheckMergeableDto,
  CheckMergeableResponseDto,
  MergeIssueDto,
} from './dto/check-mergeable.dto';
import * as fs from 'fs/promises';
import axios from 'axios';
import { FilesService } from '../files/files.service';
import { WebhookService, SynthesisWebhookPayload } from '../webhook/webhook.service';
import { EditSessionEntity, WorkerStatus } from '../edit-sessions/entities/edit-session.entity';

@Injectable()
export class WorkerJobsService {
  private readonly logger = new Logger(WorkerJobsService.name);

  constructor(
    @InjectRepository(WorkerJob)
    private workerJobRepository: Repository<WorkerJob>,
    @InjectRepository(EditSessionEntity)
    private editSessionRepository: Repository<EditSessionEntity>,
    @InjectQueue('pdf-validation') private validationQueue: Queue,
    @InjectQueue('pdf-conversion') private conversionQueue: Queue,
    @InjectQueue('pdf-synthesis') private synthesisQueue: Queue,
    private filesService: FilesService,
    private webhookService: WebhookService,
  ) {}

  // ============================================================================
  // Merge Check (Dry-run)
  // ============================================================================

  /**
   * 병합 가능 여부 체크 (dry-run)
   * 실제 파일 생성 없이 병합 가능 여부만 확인
   */
  async checkMergeable(dto: CheckMergeableDto): Promise<CheckMergeableResponseDto> {
    const issues: MergeIssueDto[] = [];

    // 1. 표지 파일 존재 확인
    let coverUrl = dto.coverUrl;
    if (dto.coverFileId) {
      try {
        const coverFile = await this.filesService.findById(dto.coverFileId);
        coverUrl = coverFile.filePath;
      } catch {
        issues.push({
          code: 'COVER_FILE_NOT_FOUND',
          message: '표지 파일을 찾을 수 없습니다.',
        });
      }
    }

    // 2. 내지 파일 존재 확인
    let contentUrl = dto.contentUrl;
    if (dto.contentFileId) {
      try {
        const contentFile = await this.filesService.findById(dto.contentFileId);
        contentUrl = contentFile.filePath;
      } catch {
        issues.push({
          code: 'CONTENT_FILE_NOT_FOUND',
          message: '내지 파일을 찾을 수 없습니다.',
        });
      }
    }

    // 3. 파일 URL 필수 체크
    if (!coverUrl && !dto.coverFileId) {
      issues.push({
        code: 'COVER_URL_REQUIRED',
        message: '표지 URL 또는 파일 ID가 필요합니다.',
      });
    }

    if (!contentUrl && !dto.contentFileId) {
      issues.push({
        code: 'CONTENT_URL_REQUIRED',
        message: '내지 URL 또는 파일 ID가 필요합니다.',
      });
    }

    // 4. 파일 접근 가능 여부 확인 (실제 존재 여부)
    if (coverUrl && issues.filter(i => i.code.startsWith('COVER_')).length === 0) {
      const coverAccessible = await this.checkFileAccessible(coverUrl);
      if (!coverAccessible) {
        issues.push({
          code: 'COVER_FILE_INACCESSIBLE',
          message: '표지 파일에 접근할 수 없습니다.',
        });
      }
    }

    if (contentUrl && issues.filter(i => i.code.startsWith('CONTENT_')).length === 0) {
      const contentAccessible = await this.checkFileAccessible(contentUrl);
      if (!contentAccessible) {
        issues.push({
          code: 'CONTENT_FILE_INACCESSIBLE',
          message: '내지 파일에 접근할 수 없습니다.',
        });
      }
    }

    // 5. 책등 폭 유효성 체크
    if (dto.spineWidth < 0) {
      issues.push({
        code: 'INVALID_SPINE_WIDTH',
        message: '책등 폭은 0 이상이어야 합니다.',
      });
    }

    this.logger.log(
      `Check mergeable for session ${dto.editSessionId}: ${issues.length === 0 ? 'OK' : issues.map(i => i.code).join(', ')}`,
    );

    return {
      mergeable: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * 파일 접근 가능 여부 확인
   */
  private async checkFileAccessible(url: string): Promise<boolean> {
    try {
      if (url.startsWith('/') || url.startsWith('./')) {
        // 로컬 파일
        await fs.access(url);
        return true;
      } else {
        // 원격 URL
        const response = await axios.head(url, { timeout: 5000 });
        return response.status === 200;
      }
    } catch {
      return false;
    }
  }

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
      editSessionId: createValidationJobDto.editSessionId || null,
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
      editSessionId: createSynthesisJobDto.editSessionId || null,
      fileId: coverFileId, // 대표 파일로 표지 사용
      inputFileUrl: coverUrl,
      options: {
        coverFileId,
        contentFileId,
        coverUrl,
        contentUrl,
        spineWidth: createSynthesisJobDto.spineWidth,
        orderId: createSynthesisJobDto.orderId,
        callbackUrl: createSynthesisJobDto.callbackUrl,
      },
    });

    const savedJob = await this.workerJobRepository.save(job);

    // 우선순위 설정
    const jobOptions: { priority?: number } = {};
    if (createSynthesisJobDto.priority === 'high') {
      jobOptions.priority = 1;
    } else if (createSynthesisJobDto.priority === 'low') {
      jobOptions.priority = 10;
    } else {
      jobOptions.priority = 5; // normal
    }

    await this.synthesisQueue.add(
      'synthesize-pdf',
      {
        jobId: savedJob.id,
        coverFileId,
        contentFileId,
        coverUrl,
        contentUrl,
        spineWidth: createSynthesisJobDto.spineWidth,
        orderId: createSynthesisJobDto.orderId,
        callbackUrl: createSynthesisJobDto.callbackUrl,
      },
      jobOptions,
    );

    this.logger.log(
      `Synthesis job created: ${savedJob.id}, orderId: ${createSynthesisJobDto.orderId || 'N/A'}, priority: ${createSynthesisJobDto.priority || 'normal'}`,
    );

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
    const job = await this.workerJobRepository.findOne({
      where: { id },
      relations: ['editSession'],
    });

    if (!job) {
      throw new NotFoundException(`Worker job with ID ${id} not found`);
    }

    Object.assign(job, updateJobStatusDto);

    if (
      updateJobStatusDto.status === WorkerJobStatus.COMPLETED ||
      updateJobStatusDto.status === WorkerJobStatus.FAILED
    ) {
      job.completedAt = new Date();
    }

    const savedJob = await this.workerJobRepository.save(job);

    // Update EditSession workerStatus and send webhook callback
    if (job.editSessionId) {
      await this.updateEditSessionWorkerStatus(job, updateJobStatusDto);
    }

    // Synthesis 작업 완료/실패 시 콜백 전송
    if (
      job.jobType === WorkerJobType.SYNTHESIZE &&
      job.options?.callbackUrl &&
      (updateJobStatusDto.status === WorkerJobStatus.COMPLETED ||
        updateJobStatusDto.status === WorkerJobStatus.FAILED)
    ) {
      await this.sendSynthesisCallback(savedJob);
    }

    return savedJob;
  }

  /**
   * Synthesis 작업 완료/실패 시 콜백 전송
   */
  private async sendSynthesisCallback(job: WorkerJob): Promise<void> {
    const callbackUrl = job.options?.callbackUrl;
    if (!callbackUrl) {
      return;
    }

    try {
      const isCompleted = job.status === WorkerJobStatus.COMPLETED;
      const payload: SynthesisWebhookPayload = {
        event: isCompleted ? 'synthesis.completed' : 'synthesis.failed',
        jobId: job.id,
        orderId: job.options?.orderId,
        status: isCompleted ? 'completed' : 'failed',
        outputFileUrl: isCompleted ? (job.outputFileUrl ?? undefined) : undefined,
        result: isCompleted ? job.result : undefined,
        errorMessage: !isCompleted ? (job.errorMessage ?? undefined) : undefined,
        timestamp: new Date().toISOString(),
      };

      const success = await this.webhookService.sendCallback(callbackUrl, payload);

      if (success) {
        this.logger.log(`Synthesis callback sent successfully for job ${job.id}`);
      } else {
        this.logger.warn(`Synthesis callback failed for job ${job.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send synthesis callback: ${error.message}`);
    }
  }

  /**
   * EditSession의 workerStatus를 업데이트하고 웹훅 콜백 전송
   */
  private async updateEditSessionWorkerStatus(
    job: WorkerJob,
    updateDto: UpdateJobStatusDto,
  ): Promise<void> {
    if (!job.editSessionId) {
      this.logger.warn(`Job ${job.id} has no editSessionId, skipping session update`);
      return;
    }

    const session = await this.editSessionRepository.findOne({
      where: { id: job.editSessionId },
    });

    if (!session) {
      this.logger.warn(`EditSession ${job.editSessionId} not found for job ${job.id}`);
      return;
    }

    // Update workerStatus based on job status
    let newWorkerStatus: WorkerStatus | null = null;

    if (updateDto.status === WorkerJobStatus.PROCESSING) {
      newWorkerStatus = WorkerStatus.PROCESSING;
    } else if (updateDto.status === WorkerJobStatus.COMPLETED) {
      // Check if all jobs for this session are completed
      const allJobsCompleted = await this.areAllSessionJobsCompleted(job.editSessionId);
      newWorkerStatus = allJobsCompleted ? WorkerStatus.VALIDATED : WorkerStatus.PROCESSING;
    } else if (updateDto.status === WorkerJobStatus.FAILED) {
      newWorkerStatus = WorkerStatus.FAILED;
      session.workerError = updateDto.errorMessage || 'Unknown error';
    }

    if (newWorkerStatus) {
      session.workerStatus = newWorkerStatus;
      await this.editSessionRepository.save(session);
      this.logger.log(`Updated EditSession ${session.id} workerStatus to ${newWorkerStatus}`);

      // Send webhook callback when validation completes or fails
      if (
        newWorkerStatus === WorkerStatus.VALIDATED ||
        newWorkerStatus === WorkerStatus.FAILED
      ) {
        await this.sendWebhookCallback(session, job, newWorkerStatus);
      }
    }
  }

  /**
   * 세션의 모든 Worker 작업이 완료되었는지 확인
   */
  private async areAllSessionJobsCompleted(editSessionId: string): Promise<boolean> {
    const jobs = await this.workerJobRepository.find({
      where: { editSessionId },
    });

    return jobs.every(
      (j) =>
        j.status === WorkerJobStatus.COMPLETED || j.status === WorkerJobStatus.FAILED,
    );
  }

  /**
   * 웹훅 콜백 전송
   */
  private async sendWebhookCallback(
    session: EditSessionEntity,
    job: WorkerJob,
    workerStatus: WorkerStatus,
  ): Promise<void> {
    if (!session.callbackUrl) {
      this.logger.log(`No callback URL for session ${session.id}, skipping webhook`);
      return;
    }

    try {
      const event = workerStatus === WorkerStatus.VALIDATED ? 'session.validated' : 'session.failed';
      const status = workerStatus === WorkerStatus.VALIDATED ? 'validated' : 'failed';
      const payload = {
        event: event as 'session.validated' | 'session.failed',
        sessionId: session.id,
        orderSeqno: Number(session.orderSeqno),
        status: status as 'validated' | 'failed',
        fileType: job.options?.fileType as 'cover' | 'content' | undefined,
        errorMessage: session.workerError || undefined,
        result: job.result,
        timestamp: new Date().toISOString(),
      };

      const success = await this.webhookService.sendCallback(session.callbackUrl, payload);

      if (success) {
        this.logger.log(`Webhook callback sent successfully for session ${session.id}`);
      } else {
        this.logger.warn(`Webhook callback failed for session ${session.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send webhook callback: ${error.message}`);
    }
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
