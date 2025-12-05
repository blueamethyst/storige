import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { TemplatesModule } from './templates/templates.module';
import { LibraryModule } from './library/library.module';
import { StorageModule } from './storage/storage.module';
import { WorkerJobsModule } from './worker-jobs/worker-jobs.module';
import { EditorModule } from './editor/editor.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database (MariaDB)
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
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
      }),
    }),

    // Redis Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),

    // Feature modules
    HealthModule,
    AuthModule,
    TemplatesModule,
    LibraryModule,
    StorageModule,
    WorkerJobsModule,
    EditorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
