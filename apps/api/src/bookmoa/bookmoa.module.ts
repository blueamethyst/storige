import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BookmoaMemberEntity } from '../bookmoa-entities/member.entity';
import { BookmoaOrderEntity } from '../bookmoa-entities/order.entity';
import { BookmoaCategoryEntity } from '../bookmoa-entities/category.entity';
import { BookmoaService } from './bookmoa.service';
import { BookmoaController } from './bookmoa.controller';

/**
 * Bookmoa 모듈
 * bookmoa 쇼핑몰 데이터베이스에 읽기 전용으로 연결합니다.
 */
@Global()
@Module({
  imports: [
    // Bookmoa 데이터베이스 연결 (읽기 전용)
    TypeOrmModule.forRootAsync({
      name: 'bookmoa',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mariadb',
        name: 'bookmoa',
        host: config.get('BOOKMOA_DB_HOST', 'localhost'),
        port: config.get('BOOKMOA_DB_PORT', 3306),
        username: config.get('BOOKMOA_DB_USER', 'bookmoa_readonly'),
        password: config.get('BOOKMOA_DB_PASSWORD', ''),
        database: config.get('BOOKMOA_DB_NAME', 'bookmoa'),
        entities: [BookmoaMemberEntity, BookmoaOrderEntity, BookmoaCategoryEntity],
        synchronize: false, // 읽기 전용이므로 절대 동기화하지 않음
        logging: config.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
      }),
    }),

    // Bookmoa 엔티티 등록
    TypeOrmModule.forFeature(
      [BookmoaMemberEntity, BookmoaOrderEntity, BookmoaCategoryEntity],
      'bookmoa',
    ),
  ],
  controllers: [BookmoaController],
  providers: [BookmoaService],
  exports: [BookmoaService, TypeOrmModule],
})
export class BookmoaModule {}
