import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@storige/types';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    const result = await this.productsService.findAll(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Try to find by UUID first, then by productId
    let product;
    try {
      // Check if id is UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        product = await this.productsService.findOne(id);
      } else {
        product = await this.productsService.findByProductId(id);
      }
    } catch {
      // If not found by UUID, try by productId
      product = await this.productsService.findByProductId(id);
    }

    return {
      success: true,
      data: product,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create(dto);
    return {
      success: true,
      data: product,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const product = await this.productsService.update(id, dto);
    return {
      success: true,
      data: product,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  @Put(':id/template-set')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async linkTemplateSet(
    @Param('id') id: string,
    @Body('templateSetId') templateSetId: string,
  ) {
    const product = await this.productsService.linkTemplateSet(id, templateSetId);
    return {
      success: true,
      data: product,
    };
  }

  @Delete(':id/template-set')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async unlinkTemplateSet(@Param('id') id: string) {
    const product = await this.productsService.unlinkTemplateSet(id);
    return {
      success: true,
      data: product,
    };
  }
}
