import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Validate parent-child relationship
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }

      // Level validation
      if (createCategoryDto.level !== parent.level + 1) {
        throw new BadRequestException(
          `Child category must be level ${parent.level + 1}`,
        );
      }

      if (parent.level === 3) {
        throw new BadRequestException('Cannot create child of level 3 category');
      }
    } else {
      // Root category must be level 1
      if (createCategoryDto.level !== 1) {
        throw new BadRequestException('Root category must be level 1');
      }
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findTree(): Promise<Category[]> {
    // Get all root categories (level 1)
    const rootCategories = await this.categoryRepository.find({
      where: { level: 1 },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Build tree recursively
    for (const root of rootCategories) {
      await this.loadChildren(root);
    }

    return rootCategories;
  }

  private async loadChildren(category: Category): Promise<void> {
    const children = await this.categoryRepository.find({
      where: { parentId: category.id },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    category.children = children;

    // Recursively load children's children
    for (const child of children) {
      await this.loadChildren(child);
    }
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findByLevel(level: 1 | 2 | 3): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { level },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    Object.assign(category, updateCategoryDto);

    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has children
    const childrenCount = await this.categoryRepository.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with children. Delete children first.',
      );
    }

    await this.categoryRepository.remove(category);
  }
}
