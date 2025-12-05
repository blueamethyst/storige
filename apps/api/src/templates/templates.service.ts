import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto, userId: string): Promise<Template> {
    const template = this.templateRepository.create({
      ...createTemplateDto,
      createdBy: userId,
    });

    return await this.templateRepository.save(template);
  }

  async findAll(categoryId?: string, isActive?: boolean): Promise<Template[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.category', 'category')
      .leftJoinAndSelect('template.creator', 'creator');

    if (categoryId) {
      query.andWhere('template.categoryId = :categoryId', { categoryId });
    }

    if (isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['category', 'creator'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async findByCode(editCode: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { editCode },
      relations: ['category'],
    });

    if (!template) {
      throw new NotFoundException(`Template with code ${editCode} not found`);
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(id);

    Object.assign(template, updateTemplateDto);

    return await this.templateRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
  }

  async copy(id: string, userId: string): Promise<Template> {
    const original = await this.findOne(id);

    const copy = this.templateRepository.create({
      name: `${original.name} (Copy)`,
      categoryId: original.categoryId,
      thumbnailUrl: original.thumbnailUrl,
      canvasData: original.canvasData,
      isActive: false,
      createdBy: userId,
    });

    return await this.templateRepository.save(copy);
  }
}
