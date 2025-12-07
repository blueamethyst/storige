import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { TemplateSet } from './entities/template-set.entity';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(TemplateSet)
    private templateSetRepository: Repository<TemplateSet>,
  ) {}

  /**
   * 고유한 코드 생성 (TMPL-XXXXXXXX 형식)
   */
  private generateCode(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${code}`;
  }

  /**
   * editCode 중복 검사
   */
  async checkEditCodeExists(editCode: string, excludeId?: string): Promise<boolean> {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.editCode = :editCode', { editCode });

    if (excludeId) {
      query.andWhere('template.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async create(createTemplateDto: CreateTemplateDto, userId?: string): Promise<Template> {
    // 템플릿 코드와 편집 코드 자동 생성
    let templateCode = this.generateCode('TMPL');
    let editCode = this.generateCode('EDIT');

    // 중복 검사 후 재생성 (최대 5회 시도)
    for (let i = 0; i < 5; i++) {
      const templateCodeExists = await this.templateRepository.findOne({ where: { templateCode } });
      if (!templateCodeExists) break;
      templateCode = this.generateCode('TMPL');
    }

    for (let i = 0; i < 5; i++) {
      const editCodeExists = await this.templateRepository.findOne({ where: { editCode } });
      if (!editCodeExists) break;
      editCode = this.generateCode('EDIT');
    }

    const template = this.templateRepository.create({
      ...createTemplateDto,
      templateCode,
      editCode,
      createdBy: userId,
    });

    return await this.templateRepository.save(template);
  }

  async findAll(categoryId?: string, isActive?: boolean): Promise<Template[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.category', 'category')
      .leftJoinAndSelect('template.creator', 'creator')
      .where('template.isDeleted = :isDeleted', { isDeleted: false });

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
      where: { id, isDeleted: false },
      relations: ['category', 'creator'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async findByCode(editCode: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { editCode, isDeleted: false },
      relations: ['category'],
    });

    if (!template) {
      throw new NotFoundException(`Template with code ${editCode} not found`);
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(id);

    // editCode 변경 시 중복 검사
    if (updateTemplateDto.editCode && updateTemplateDto.editCode !== template.editCode) {
      const exists = await this.checkEditCodeExists(updateTemplateDto.editCode, id);
      if (exists) {
        throw new ConflictException(`편집 코드 '${updateTemplateDto.editCode}'가 이미 사용 중입니다.`);
      }
    }

    Object.assign(template, updateTemplateDto);

    return await this.templateRepository.save(template);
  }

  /**
   * 템플릿이 사용 중인 템플릿셋 목록 조회
   */
  async getTemplateSetsUsingTemplate(templateId: string): Promise<TemplateSet[]> {
    const templateSets = await this.templateSetRepository.find({
      where: { isDeleted: false },
    });

    return templateSets.filter((ts) =>
      ts.templates?.some((ref) => ref.templateId === templateId),
    );
  }

  /**
   * 템플릿 삭제 (소프트 삭제)
   * @param force true인 경우 템플릿셋에서 사용 중이어도 삭제 (템플릿셋에서 해당 템플릿 참조 제거)
   */
  async remove(id: string, force = false): Promise<{ affected: number; usedByTemplateSets: string[] }> {
    const template = await this.findOne(id);

    // 사용 중인 템플릿셋 확인
    const usedByTemplateSets = await this.getTemplateSetsUsingTemplate(id);
    const usedByTemplateSetNames = usedByTemplateSets.map((ts) => ts.name);

    if (usedByTemplateSets.length > 0 && !force) {
      throw new BadRequestException({
        message: `이 템플릿은 ${usedByTemplateSets.length}개의 템플릿셋에서 사용 중입니다.`,
        usedByTemplateSets: usedByTemplateSetNames,
      });
    }

    // force 삭제인 경우, 템플릿셋에서 해당 템플릿 참조 제거
    if (force && usedByTemplateSets.length > 0) {
      for (const ts of usedByTemplateSets) {
        ts.templates = ts.templates.filter((ref) => ref.templateId !== id);
        await this.templateSetRepository.save(ts);
      }
    }

    template.isDeleted = true;
    await this.templateRepository.save(template);

    return {
      affected: 1,
      usedByTemplateSets: usedByTemplateSetNames,
    };
  }

  async copy(id: string, userId?: string): Promise<Template> {
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
