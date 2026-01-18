import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Services
import { PdfValidatorService } from './services/pdf-validator.service';
import { PdfConverterService } from './services/pdf-converter.service';
import { PdfSynthesizerService } from './services/pdf-synthesizer.service';

// Processors
import { ValidationProcessor } from './processors/validation.processor';
import { ConversionProcessor } from './processors/conversion.processor';
import { SynthesisProcessor } from './processors/synthesis.processor';

// Controllers
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Configuration - loads environment-specific file based on NODE_ENV
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),

    // Database (MariaDB - for job status updates)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mariadb',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get('DATABASE_PORT', 3306),
        username: config.get('DATABASE_USER', 'root'),
        password: config.get('DATABASE_PASSWORD', ''),
        database: config.get('DATABASE_NAME', 'storige'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
      }),
    }),

    // Redis Queue Consumers
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),

    // Register queue consumers
    BullModule.registerQueue(
      { name: 'pdf-validation' },
      { name: 'pdf-conversion' },
      { name: 'pdf-synthesis' },
    ),
  ],
  controllers: [HealthController],
  providers: [
    // Services
    PdfValidatorService,
    PdfConverterService,
    PdfSynthesizerService,

    // Processors
    ValidationProcessor,
    ConversionProcessor,
    SynthesisProcessor,
  ],
})
export class AppModule {}
