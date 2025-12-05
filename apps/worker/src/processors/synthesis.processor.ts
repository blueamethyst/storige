import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PdfSynthesizerService } from '../services/pdf-synthesizer.service';
import axios from 'axios';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface SynthesisJobData {
  jobId: string;
  coverUrl: string;
  contentUrl: string;
  spineWidth: number;
}

@Processor('pdf-synthesis')
export class SynthesisProcessor {
  private readonly logger = new Logger(SynthesisProcessor.name);
  private readonly apiBaseUrl =
    process.env.API_BASE_URL || 'http://localhost:4000/api';
  private readonly storagePath =
    process.env.STORAGE_PATH || '/app/storage/temp';

  constructor(private readonly synthesizerService: PdfSynthesizerService) {}

  @Process('synthesize-pdf')
  async handleSynthesis(job: Job<SynthesisJobData>) {
    this.logger.log(`Processing synthesis job ${job.data.jobId}`);

    try {
      // Update job status to PROCESSING
      await this.updateJobStatus(job.data.jobId, 'PROCESSING');

      // Generate output path
      const outputFilename = `synthesized_${uuidv4()}.pdf`;
      const outputPath = path.join(this.storagePath, outputFilename);

      // Synthesize PDFs
      const result = await this.synthesizerService.synthesize(
        {
          coverUrl: job.data.coverUrl,
          contentUrl: job.data.contentUrl,
          spineWidth: job.data.spineWidth,
        },
        outputPath,
      );

      // Update job status to COMPLETED
      await this.updateJobStatus(job.data.jobId, 'COMPLETED', {
        outputFileUrl: `/storage/temp/${outputFilename}`,
        result,
      });

      this.logger.log(`Synthesis job ${job.data.jobId} completed successfully`);

      return result;
    } catch (error) {
      this.logger.error(
        `Synthesis job ${job.data.jobId} error: ${error.message}`,
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
      const payload: any = { status };

      if (result) {
        payload.result = result.result || result;
        if (result.outputFileUrl) {
          payload.outputFileUrl = result.outputFileUrl;
        }
      }

      if (errorMessage) {
        payload.errorMessage = errorMessage;
      }

      await axios.patch(
        `${this.apiBaseUrl}/worker-jobs/${jobId}/status`,
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update job status: ${error.message}`,
        error.stack,
      );
    }
  }
}
