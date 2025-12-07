import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SpineController } from './spine.controller';
import { SpineService } from './spine.service';
import { Product, ProductSize } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductSize])],
  controllers: [ProductsController, SpineController],
  providers: [ProductsService, SpineService],
  exports: [ProductsService, SpineService],
})
export class ProductsModule {}
