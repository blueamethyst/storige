import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditSession } from './entities/edit-session.entity';
import { CreateEditSessionDto, UpdateEditSessionDto } from './dto/edit-session.dto';

@Injectable()
export class EditorService {
  constructor(
    @InjectRepository(EditSession)
    private editSessionRepository: Repository<EditSession>,
  ) {}

  async createSession(createEditSessionDto: CreateEditSessionDto): Promise<EditSession> {
    const session = this.editSessionRepository.create(createEditSessionDto);
    return await this.editSessionRepository.save(session);
  }

  async findAll(userId?: string): Promise<EditSession[]> {
    const query = this.editSessionRepository.createQueryBuilder('session');

    if (userId) {
      query.andWhere('session.userId = :userId', { userId });
    }

    return await query
      .leftJoinAndSelect('session.template', 'template')
      .orderBy('session.updatedAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<EditSession> {
    const session = await this.editSessionRepository.findOne({
      where: { id },
      relations: ['template', 'user'],
    });

    if (!session) {
      throw new NotFoundException(`Edit session with ID ${id} not found`);
    }

    return session;
  }

  async updateSession(id: string, updateEditSessionDto: UpdateEditSessionDto): Promise<EditSession> {
    const session = await this.findOne(id);

    Object.assign(session, updateEditSessionDto);

    return await this.editSessionRepository.save(session);
  }

  async deleteSession(id: string): Promise<void> {
    const session = await this.findOne(id);
    await this.editSessionRepository.remove(session);
  }

  async autoSave(id: string, canvasData: any): Promise<EditSession> {
    const session = await this.findOne(id);
    session.canvasData = canvasData;
    return await this.editSessionRepository.save(session);
  }

  // Export functionality (placeholder - actual PDF generation would be in worker)
  async exportToPdf(sessionId: string, exportOptions?: any): Promise<{ jobId: string }> {
    const session = await this.findOne(sessionId);

    // In a real implementation, this would:
    // 1. Create a worker job for PDF export
    // 2. Return the job ID for status tracking
    // For now, we'll return a placeholder

    return {
      jobId: 'placeholder-job-id',
    };
  }
}
