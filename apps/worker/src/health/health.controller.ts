import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('health')
export class HealthController {
  constructor(
    @InjectQueue('pdf-validation') private validationQueue: Queue,
    @InjectQueue('pdf-conversion') private conversionQueue: Queue,
    @InjectQueue('pdf-synthesis') private synthesisQueue: Queue,
  ) {}

  @Get()
  async check() {
    const [validationCounts, conversionCounts, synthesisCounts] =
      await Promise.all([
        this.getQueueCounts(this.validationQueue),
        this.getQueueCounts(this.conversionQueue),
        this.getQueueCounts(this.synthesisQueue),
      ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      queues: {
        validation: validationCounts,
        conversion: conversionCounts,
        synthesis: synthesisCounts,
      },
    };
  }

  @Get('ready')
  async ready() {
    // Check if Redis connection is alive by pinging the queue
    try {
      await this.validationQueue.client.ping();
      return { status: 'ready' };
    } catch {
      return { status: 'not_ready', error: 'Redis connection failed' };
    }
  }

  @Get('live')
  live() {
    return { status: 'alive' };
  }

  private async getQueueCounts(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
