import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../auth/entities/user.entity';
import { PaperTypeEntity } from '../../products/entities/paper-type.entity';
import { BindingTypeEntity } from '../../products/entities/binding-type.entity';
import { AdminSeedService } from './admin-seed.service';
import { SpineSeedService } from './spine-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PaperTypeEntity, BindingTypeEntity]),
  ],
  providers: [AdminSeedService, SpineSeedService],
  exports: [AdminSeedService, SpineSeedService],
})
export class SeedModule {}
