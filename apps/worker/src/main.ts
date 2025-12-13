import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables before anything else
config({ path: resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 4001;
  await app.listen(port);

  console.log(`🔧 Worker Service running on http://localhost:${port}`);
  console.log(`📋 Waiting for jobs from Redis queue...`);
}

bootstrap();
