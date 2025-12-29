import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'pdf-validation' },
      { name: 'pdf-conversion' },
      { name: 'pdf-synthesis' },
    ),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
