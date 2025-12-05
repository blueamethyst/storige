import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { LibraryFont } from './entities/font.entity';
import { LibraryBackground } from './entities/background.entity';
import { LibraryClipart } from './entities/clipart.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LibraryFont,
      LibraryBackground,
      LibraryClipart,
    ]),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
