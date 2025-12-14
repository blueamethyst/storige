import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { GenerationService } from '../services/generation.service';
import { GenerationRequestDto } from '../dto/generation.dto';

/**
 * 생성 작업 데이터 인터페이스
 */
interface GenerationJobData {
  generationId: string;
  userId: string;
  request: GenerationRequestDto;
}

/**
 * AI 템플릿 생성 Queue Processor
 */
@Processor('ai-generation')
export class GenerationProcessor {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(private generationService: GenerationService) {}

  /**
   * 템플릿 생성 작업 처리
   */
  @Process('generate-template')
  async handleGeneration(job: Job<GenerationJobData>): Promise<void> {
    const { generationId, request } = job.data;

    this.logger.log(`Processing generation job: ${generationId}`);

    try {
      await this.generationService.processGeneration(generationId, request);

      this.logger.log(`Generation job completed: ${generationId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Generation job failed: ${generationId} - ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * 작업 완료 이벤트
   */
  @OnQueueCompleted()
  onCompleted(job: Job<GenerationJobData>): void {
    this.logger.debug(
      `Job ${job.id} completed for generation: ${job.data.generationId}`,
    );
  }

  /**
   * 작업 실패 이벤트
   */
  @OnQueueFailed()
  onFailed(job: Job<GenerationJobData>, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed for generation: ${job.data.generationId}`,
      error.stack,
    );
  }
}
