import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PdfValidatorService } from '../services/pdf-validator.service';
import axios from 'axios';

interface ValidationJobData {
  jobId: string;
  fileUrl: string;
  fileType: 'cover' | 'content';
  orderOptions: {
    size: { width: number; height: number };
    pages: number;
    binding: 'perfect' | 'saddle';
    bleed: number;
  };
}

@Processor('pdf-validation')
export class ValidationProcessor {
  private readonly logger = new Logger(ValidationProcessor.name);
  private readonly apiBaseUrl =
    process.env.API_BASE_URL || 'http://localhost:4000/api';

  constructor(private readonly validatorService: PdfValidatorService) {}

  @Process('validate-pdf')
  async handleValidation(job: Job<ValidationJobData>) {
    this.logger.log(`Processing validation job ${job.data.jobId}`);

    try {
      // Update job status to PROCESSING
      await this.updateJobStatus(job.data.jobId, 'PROCESSING');

      // Validate PDF
      const result = await this.validatorService.validate(job.data.fileUrl, {
        fileType: job.data.fileType,
        orderOptions: job.data.orderOptions,
      });

      // Update job status to COMPLETED or FAILED
      if (result.valid) {
        await this.updateJobStatus(job.data.jobId, 'COMPLETED', {
          result,
        });
        this.logger.log(`Validation job ${job.data.jobId} completed successfully`);
      } else {
        await this.updateJobStatus(
          job.data.jobId,
          'FAILED',
          { result },
          `Validation failed: ${result.errors.length} errors found`,
        );
        this.logger.warn(`Validation job ${job.data.jobId} failed`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Validation job ${job.data.jobId} error: ${error.message}`,
        error.stack,
      );

      // Update job status to FAILED
      await this.updateJobStatus(
        job.data.jobId,
        'FAILED',
        null,
        error.message,
      );

      throw error;
    }
  }

  /**
   * Update job status in API
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    result?: any,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await axios.patch(
        `${this.apiBaseUrl}/worker-jobs/${jobId}/status`,
        {
          status,
          result,
          errorMessage,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update job status: ${error.message}`,
        error.stack,
      );
    }
  }
}
