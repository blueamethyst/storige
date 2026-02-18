import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables before anything else
// Priority: .env.{NODE_ENV} > .env
const nodeEnv = process.env.NODE_ENV || 'development';
config({ path: resolve(__dirname, `../.env.${nodeEnv}`) });
config({ path: resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PayloadTooLargeResponseDto } from './common/dto/error-response.dto';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Body parser size limit (캔버스 데이터 등 대용량 JSON 허용)
  const configService = app.get(ConfigService);
  const maxBodySize = configService.get<string>('MAX_BODY_SIZE', '100mb');
  app.useBodyParser('json', { limit: maxBodySize });
  app.useBodyParser('urlencoded', { limit: maxBodySize, extended: true });

  // Cookie parser middleware
  app.use(cookieParser());

  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN;
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
  ];
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map(o => o.trim())
    : defaultOrigins;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        console.log(`CORS blocked for origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-API-Key'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Storige API')
    .setDescription('Print Shopping Mall API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      'api-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [PayloadTooLargeResponseDto],
  });
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`📦 Max body size: ${maxBodySize}`);
}

bootstrap();
