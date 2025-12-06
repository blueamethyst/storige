import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { EditorContent } from './entities/editor-content.entity';
import { QueryEditorContentDto } from './dto/query-editor-content.dto';
import { UpdateEditorContentDto } from './dto/update-editor-content.dto';
import { EditorContentType } from '@storige/types';

@Injectable()
export class EditorContentsService {
  constructor(
    @InjectRepository(EditorContent)
    private readonly editorContentRepository: Repository<EditorContent>,
  ) {}

  async findByType(
    type: EditorContentType,
    query: QueryEditorContentDto,
  ): Promise<{ items: EditorContent[]; total: number; page: number; pageSize: number }> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const sortField = query.sortField || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const queryBuilder = this.editorContentRepository
      .createQueryBuilder('content')
      .where('content.type = :type', { type });

    // isActive 필터
    if (query.isActive !== undefined) {
      queryBuilder.andWhere('content.is_active = :isActive', { isActive: query.isActive });
    } else {
      // 기본적으로 활성화된 콘텐츠만
      queryBuilder.andWhere('content.is_active = :isActive', { isActive: true });
    }

    // 검색
    if (query.search) {
      queryBuilder.andWhere('content.name LIKE :search', { search: `%${query.search}%` });
    }

    // 태그 필터 (JSON 필드 검색)
    if (query.tags && query.tags.length > 0) {
      query.tags.forEach((tag, index) => {
        queryBuilder.andWhere(`JSON_CONTAINS(content.tags, :tag${index})`, {
          [`tag${index}`]: JSON.stringify(tag),
        });
      });
    }

    // 정렬
    const orderField = sortField === 'name' ? 'content.name' :
                       sortField === 'createdAt' ? 'content.created_at' : 'content.updated_at';
    queryBuilder.orderBy(orderField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // 페이지네이션
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total, page, pageSize };
  }

  async getTemplates(query: QueryEditorContentDto) {
    return this.findByType('template', query);
  }

  async getFrames(query: QueryEditorContentDto) {
    return this.findByType('frame', query);
  }

  async getImages(query: QueryEditorContentDto) {
    return this.findByType('image', query);
  }

  async getBackgrounds(query: QueryEditorContentDto) {
    return this.findByType('background', query);
  }

  async getElements(query: QueryEditorContentDto) {
    return this.findByType('element', query);
  }

  async findOne(id: string): Promise<EditorContent> {
    const content = await this.editorContentRepository.findOne({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`EditorContent with id ${id} not found`);
    }

    return content;
  }

  async update(type: EditorContentType, id: string, dto: UpdateEditorContentDto): Promise<EditorContent> {
    const content = await this.findOne(id);

    if (content.type !== type) {
      throw new NotFoundException(`EditorContent with id ${id} and type ${type} not found`);
    }

    Object.assign(content, dto);
    return this.editorContentRepository.save(content);
  }
}
