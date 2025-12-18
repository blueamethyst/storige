import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { LibraryFont } from './entities/font.entity';
import { LibraryBackground } from './entities/background.entity';
import { LibraryClipart } from './entities/clipart.entity';
import { LibraryShape } from './entities/shape.entity';
import { LibraryFrame } from './entities/frame.entity';
import { LibraryCategory, LibraryCategoryType } from './entities/category.entity';
import {
  CreateFontDto,
  UpdateFontDto,
  CreateBackgroundDto,
  UpdateBackgroundDto,
  CreateClipartDto,
  UpdateClipartDto,
  CreateShapeDto,
  UpdateShapeDto,
  CreateFrameDto,
  UpdateFrameDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/library.dto';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(LibraryFont)
    private fontRepository: Repository<LibraryFont>,
    @InjectRepository(LibraryBackground)
    private backgroundRepository: Repository<LibraryBackground>,
    @InjectRepository(LibraryClipart)
    private clipartRepository: Repository<LibraryClipart>,
    @InjectRepository(LibraryShape)
    private shapeRepository: Repository<LibraryShape>,
    @InjectRepository(LibraryFrame)
    private frameRepository: Repository<LibraryFrame>,
    @InjectRepository(LibraryCategory)
    private categoryRepository: Repository<LibraryCategory>,
  ) {}

  // ============================================================================
  // Fonts
  // ============================================================================

  async createFont(createFontDto: CreateFontDto): Promise<LibraryFont> {
    const font = this.fontRepository.create(createFontDto);
    return await this.fontRepository.save(font);
  }

  async findAllFonts(isActive?: boolean): Promise<LibraryFont[]> {
    const query = this.fontRepository.createQueryBuilder('font');

    if (isActive !== undefined) {
      query.where('font.isActive = :isActive', { isActive });
    }

    return await query.orderBy('font.name', 'ASC').getMany();
  }

  async findOneFont(id: string): Promise<LibraryFont> {
    const font = await this.fontRepository.findOne({ where: { id } });

    if (!font) {
      throw new NotFoundException(`Font with ID ${id} not found`);
    }

    return font;
  }

  async updateFont(id: string, updateFontDto: UpdateFontDto): Promise<LibraryFont> {
    const font = await this.findOneFont(id);
    Object.assign(font, updateFontDto);
    return await this.fontRepository.save(font);
  }

  async removeFont(id: string): Promise<void> {
    const font = await this.findOneFont(id);
    await this.fontRepository.remove(font);
  }

  // ============================================================================
  // Backgrounds
  // ============================================================================

  async createBackground(createBackgroundDto: CreateBackgroundDto): Promise<LibraryBackground> {
    const background = this.backgroundRepository.create(createBackgroundDto);
    return await this.backgroundRepository.save(background);
  }

  async findAllBackgrounds(category?: string, isActive?: boolean): Promise<LibraryBackground[]> {
    const query = this.backgroundRepository.createQueryBuilder('background');

    if (category) {
      query.andWhere('background.category = :category', { category });
    }

    if (isActive !== undefined) {
      query.andWhere('background.isActive = :isActive', { isActive });
    }

    return await query.orderBy('background.name', 'ASC').getMany();
  }

  async findOneBackground(id: string): Promise<LibraryBackground> {
    const background = await this.backgroundRepository.findOne({ where: { id } });

    if (!background) {
      throw new NotFoundException(`Background with ID ${id} not found`);
    }

    return background;
  }

  async updateBackground(
    id: string,
    updateBackgroundDto: UpdateBackgroundDto,
  ): Promise<LibraryBackground> {
    const background = await this.findOneBackground(id);
    Object.assign(background, updateBackgroundDto);
    return await this.backgroundRepository.save(background);
  }

  async removeBackground(id: string): Promise<void> {
    const background = await this.findOneBackground(id);
    await this.backgroundRepository.remove(background);
  }

  // ============================================================================
  // Cliparts
  // ============================================================================

  async createClipart(createClipartDto: CreateClipartDto): Promise<LibraryClipart> {
    const clipart = this.clipartRepository.create(createClipartDto);
    return await this.clipartRepository.save(clipart);
  }

  async findAllCliparts(category?: string, isActive?: boolean): Promise<LibraryClipart[]> {
    const query = this.clipartRepository.createQueryBuilder('clipart');

    if (category) {
      query.andWhere('clipart.category = :category', { category });
    }

    if (isActive !== undefined) {
      query.andWhere('clipart.isActive = :isActive', { isActive });
    }

    return await query.orderBy('clipart.name', 'ASC').getMany();
  }

  async findOneClipart(id: string): Promise<LibraryClipart> {
    const clipart = await this.clipartRepository.findOne({ where: { id } });

    if (!clipart) {
      throw new NotFoundException(`Clipart with ID ${id} not found`);
    }

    return clipart;
  }

  async updateClipart(id: string, updateClipartDto: UpdateClipartDto): Promise<LibraryClipart> {
    const clipart = await this.findOneClipart(id);
    Object.assign(clipart, updateClipartDto);
    return await this.clipartRepository.save(clipart);
  }

  async removeClipart(id: string): Promise<void> {
    const clipart = await this.findOneClipart(id);
    await this.clipartRepository.remove(clipart);
  }

  async searchClipartsByTags(tags: string[]): Promise<LibraryClipart[]> {
    const query = this.clipartRepository.createQueryBuilder('clipart');

    // Search for cliparts that have any of the provided tags
    tags.forEach((tag, index) => {
      if (index === 0) {
        query.where('JSON_CONTAINS(clipart.tags, :tag)', { tag: JSON.stringify(tag) });
      } else {
        query.orWhere('JSON_CONTAINS(clipart.tags, :tag)', { tag: JSON.stringify(tag) });
      }
    });

    return await query.andWhere('clipart.isActive = :isActive', { isActive: true }).getMany();
  }

  // ============================================================================
  // Shapes
  // ============================================================================

  async createShape(createShapeDto: CreateShapeDto): Promise<LibraryShape> {
    const shape = this.shapeRepository.create(createShapeDto);
    return await this.shapeRepository.save(shape);
  }

  async findAllShapes(categoryId?: string, isActive?: boolean): Promise<LibraryShape[]> {
    const query = this.shapeRepository.createQueryBuilder('shape');

    if (categoryId) {
      query.andWhere('shape.categoryId = :categoryId', { categoryId });
    }

    if (isActive !== undefined) {
      query.andWhere('shape.isActive = :isActive', { isActive });
    }

    return await query.orderBy('shape.name', 'ASC').getMany();
  }

  async findOneShape(id: string): Promise<LibraryShape> {
    const shape = await this.shapeRepository.findOne({ where: { id } });

    if (!shape) {
      throw new NotFoundException(`Shape with ID ${id} not found`);
    }

    return shape;
  }

  async updateShape(id: string, updateShapeDto: UpdateShapeDto): Promise<LibraryShape> {
    const shape = await this.findOneShape(id);
    Object.assign(shape, updateShapeDto);
    return await this.shapeRepository.save(shape);
  }

  async removeShape(id: string): Promise<void> {
    const shape = await this.findOneShape(id);
    await this.shapeRepository.remove(shape);
  }

  // ============================================================================
  // Frames
  // ============================================================================

  async createFrame(createFrameDto: CreateFrameDto): Promise<LibraryFrame> {
    const frame = this.frameRepository.create(createFrameDto);
    return await this.frameRepository.save(frame);
  }

  async findAllFrames(categoryId?: string, isActive?: boolean): Promise<LibraryFrame[]> {
    const query = this.frameRepository.createQueryBuilder('frame');

    if (categoryId) {
      query.andWhere('frame.categoryId = :categoryId', { categoryId });
    }

    if (isActive !== undefined) {
      query.andWhere('frame.isActive = :isActive', { isActive });
    }

    return await query.orderBy('frame.name', 'ASC').getMany();
  }

  async findOneFrame(id: string): Promise<LibraryFrame> {
    const frame = await this.frameRepository.findOne({ where: { id } });

    if (!frame) {
      throw new NotFoundException(`Frame with ID ${id} not found`);
    }

    return frame;
  }

  async updateFrame(id: string, updateFrameDto: UpdateFrameDto): Promise<LibraryFrame> {
    const frame = await this.findOneFrame(id);
    Object.assign(frame, updateFrameDto);
    return await this.frameRepository.save(frame);
  }

  async removeFrame(id: string): Promise<void> {
    const frame = await this.findOneFrame(id);
    await this.frameRepository.remove(frame);
  }

  // ============================================================================
  // Categories
  // ============================================================================

  async createCategory(createCategoryDto: CreateCategoryDto): Promise<LibraryCategory> {
    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAllCategories(type?: LibraryCategoryType, isActive?: boolean): Promise<LibraryCategory[]> {
    const query = this.categoryRepository.createQueryBuilder('category');

    if (type) {
      query.andWhere('category.type = :type', { type });
    }

    if (isActive !== undefined) {
      query.andWhere('category.isActive = :isActive', { isActive });
    }

    return await query
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  async findCategoriesTree(type: LibraryCategoryType): Promise<LibraryCategory[]> {
    // Fetch root categories (parentId is null)
    const rootCategories = await this.categoryRepository.find({
      where: {
        type,
        parentId: IsNull(),
        isActive: true,
      },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Fetch children for each root
    for (const root of rootCategories) {
      root.children = await this.categoryRepository.find({
        where: {
          parentId: root.id,
          isActive: true,
        },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    }

    return rootCategories;
  }

  async findOneCategory(id: string): Promise<LibraryCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<LibraryCategory> {
    const category = await this.findOneCategory(id);
    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async removeCategory(id: string): Promise<void> {
    const category = await this.findOneCategory(id);

    // Check if category has children
    const children = await this.categoryRepository.find({
      where: { parentId: id },
    });

    if (children.length > 0) {
      // Move children to root (set parentId to null)
      for (const child of children) {
        child.parentId = null;
        await this.categoryRepository.save(child);
      }
    }

    await this.categoryRepository.remove(category);
  }
}
