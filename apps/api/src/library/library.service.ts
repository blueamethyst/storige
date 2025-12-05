import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryFont } from './entities/font.entity';
import { LibraryBackground } from './entities/background.entity';
import { LibraryClipart } from './entities/clipart.entity';
import {
  CreateFontDto,
  UpdateFontDto,
  CreateBackgroundDto,
  UpdateBackgroundDto,
  CreateClipartDto,
  UpdateClipartDto,
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
}
