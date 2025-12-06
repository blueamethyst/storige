import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditorDesign } from './entities/editor-design.entity';
import { CreateEditorDesignDto } from './dto/create-editor-design.dto';
import { UpdateEditorDesignDto } from './dto/update-editor-design.dto';

@Injectable()
export class EditorDesignsService {
  constructor(
    @InjectRepository(EditorDesign)
    private readonly editorDesignRepository: Repository<EditorDesign>,
  ) {}

  async create(userId: string, dto: CreateEditorDesignDto): Promise<EditorDesign> {
    const design = this.editorDesignRepository.create({
      userId,
      name: dto.name,
      imageUrl: dto.imageUrl || null,
      mediaUrl: dto.mediaUrl,
      metadata: dto.metadata,
    });

    return this.editorDesignRepository.save(design);
  }

  async findAllByUser(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: EditorDesign[]; total: number; page: number; pageSize: number }> {
    const [items, total] = await this.editorDesignRepository.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async findOne(id: string, userId: string): Promise<EditorDesign> {
    const design = await this.editorDesignRepository.findOne({
      where: { id },
    });

    if (!design) {
      throw new NotFoundException(`EditorDesign with id ${id} not found`);
    }

    if (design.userId !== userId) {
      throw new ForbiddenException('You do not have access to this design');
    }

    return design;
  }

  async update(id: string, userId: string, dto: UpdateEditorDesignDto): Promise<EditorDesign> {
    const design = await this.findOne(id, userId);

    if (dto.name !== undefined) {
      design.name = dto.name;
    }
    if (dto.imageUrl !== undefined) {
      design.imageUrl = dto.imageUrl;
    }
    if (dto.mediaUrl !== undefined) {
      design.mediaUrl = dto.mediaUrl;
    }
    if (dto.metadata !== undefined) {
      design.metadata = {
        ...design.metadata,
        ...dto.metadata,
      };
    }

    return this.editorDesignRepository.save(design);
  }

  async remove(id: string, userId: string): Promise<void> {
    const design = await this.findOne(id, userId);
    await this.editorDesignRepository.remove(design);
  }
}
