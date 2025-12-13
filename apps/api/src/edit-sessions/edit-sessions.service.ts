import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EditSessionEntity,
  SessionStatus,
  SessionMode,
} from './entities/edit-session.entity';
import { CreateEditSessionDto } from './dto/create-edit-session.dto';
import { UpdateEditSessionDto } from './dto/update-edit-session.dto';
import {
  EditSessionResponseDto,
  FileInfoDto,
} from './dto/edit-session-response.dto';
import { WorkerJobsService } from '../worker-jobs/worker-jobs.service';

@Injectable()
export class EditSessionsService {
  private readonly logger = new Logger(EditSessionsService.name);

  constructor(
    @InjectRepository(EditSessionEntity)
    private sessionRepository: Repository<EditSessionEntity>,
    @Inject(forwardRef(() => WorkerJobsService))
    private workerJobsService: WorkerJobsService,
  ) {}

  /**
   * 편집 세션 생성
   */
  async create(dto: CreateEditSessionDto): Promise<EditSessionEntity> {
    const session = this.sessionRepository.create({
      orderSeqno: dto.orderSeqno,
      memberSeqno: dto.memberSeqno,
      mode: dto.mode,
      coverFileId: dto.coverFileId,
      contentFileId: dto.contentFileId,
      templateSetId: dto.templateSetId,
      canvasData: dto.canvasData,
      metadata: dto.metadata,
    });

    const saved = await this.sessionRepository.save(session);
    this.logger.log(`Created edit session ${saved.id} for order ${dto.orderSeqno}`);

    return saved;
  }

  /**
   * 주문 번호로 세션 목록 조회
   */
  async findByOrderSeqno(orderSeqno: number): Promise<EditSessionEntity[]> {
    return this.sessionRepository.find({
      where: { orderSeqno },
      relations: ['coverFile', 'contentFile'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 회원 번호로 세션 목록 조회
   */
  async findByMemberSeqno(memberSeqno: number): Promise<EditSessionEntity[]> {
    return this.sessionRepository.find({
      where: { memberSeqno },
      relations: ['coverFile', 'contentFile'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 세션 ID로 조회
   */
  async findById(id: string): Promise<EditSessionEntity> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['coverFile', 'contentFile'],
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '편집 세션을 찾을 수 없습니다.',
        details: { sessionId: id },
      });
    }

    return session;
  }

  /**
   * 세션 업데이트
   */
  async update(
    id: string,
    dto: UpdateEditSessionDto,
    userId: number,
  ): Promise<EditSessionEntity> {
    const session = await this.findById(id);

    // 권한 확인: 세션 소유자만 수정 가능
    if (Number(session.memberSeqno) !== userId) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: '이 세션을 수정할 권한이 없습니다.',
      });
    }

    // 캔버스 데이터 업데이트
    if (dto.canvasData !== undefined) {
      session.canvasData = dto.canvasData;
    }

    // 메타데이터 병합
    if (dto.metadata !== undefined) {
      session.metadata = { ...session.metadata, ...dto.metadata };
    }

    // 상태 업데이트
    if (dto.status !== undefined) {
      session.status = dto.status;
      if (dto.status === SessionStatus.COMPLETE) {
        session.completedAt = new Date();
      }
    }

    // 파일 ID 업데이트
    if (dto.coverFileId !== undefined) {
      session.coverFileId = dto.coverFileId;
    }
    if (dto.contentFileId !== undefined) {
      session.contentFileId = dto.contentFileId;
    }

    const updated = await this.sessionRepository.save(session);
    this.logger.log(`Updated edit session ${id}`);

    return updated;
  }

  /**
   * 세션 완료 처리
   */
  async complete(id: string, userId: number): Promise<EditSessionEntity> {
    const session = await this.findById(id);

    if (Number(session.memberSeqno) !== userId) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: '이 세션을 완료할 권한이 없습니다.',
      });
    }

    session.status = SessionStatus.COMPLETE;
    session.completedAt = new Date();

    const completed = await this.sessionRepository.save(session);
    this.logger.log(`Completed edit session ${id}`);

    // Create Worker validation jobs for associated files
    await this.createValidationJobs(completed);

    return completed;
  }

  /**
   * 완료된 세션의 파일에 대한 Worker 검증 작업 생성
   */
  private async createValidationJobs(session: EditSessionEntity): Promise<void> {
    try {
      // Get order options from metadata or use defaults
      const orderOptions = {
        size: session.metadata?.size || { width: 210, height: 297 },
        pages: session.metadata?.pages || 1,
        binding: session.metadata?.binding || 'perfect',
        bleed: session.metadata?.bleed || 3,
        paperThickness: session.metadata?.paperThickness,
      };

      // Create validation job for cover file
      if (session.coverFileId) {
        try {
          const job = await this.workerJobsService.createValidationJob({
            fileId: session.coverFileId,
            fileType: 'cover',
            orderOptions,
          });
          this.logger.log(
            `Created validation job ${job.id} for cover file ${session.coverFileId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create validation job for cover file: ${error.message}`,
          );
        }
      }

      // Create validation job for content file
      if (session.contentFileId) {
        try {
          const job = await this.workerJobsService.createValidationJob({
            fileId: session.contentFileId,
            fileType: 'content',
            orderOptions,
          });
          this.logger.log(
            `Created validation job ${job.id} for content file ${session.contentFileId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create validation job for content file: ${error.message}`,
          );
        }
      }
    } catch (error) {
      // Don't fail session completion if worker job creation fails
      this.logger.error(
        `Failed to create validation jobs for session ${session.id}: ${error.message}`,
      );
    }
  }

  /**
   * 세션 삭제 (소프트 삭제)
   */
  async delete(id: string, userId: number): Promise<void> {
    const session = await this.findById(id);

    if (Number(session.memberSeqno) !== userId) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: '이 세션을 삭제할 권한이 없습니다.',
      });
    }

    await this.sessionRepository.softDelete(id);
    this.logger.log(`Deleted edit session ${id}`);
  }

  /**
   * 엔티티를 응답 DTO로 변환
   */
  toResponseDto(session: EditSessionEntity): EditSessionResponseDto {
    const response: EditSessionResponseDto = {
      id: session.id,
      orderSeqno: Number(session.orderSeqno),
      memberSeqno: Number(session.memberSeqno),
      status: session.status,
      mode: session.mode,
      coverFileId: session.coverFileId,
      contentFileId: session.contentFileId,
      templateSetId: session.templateSetId,
      canvasData: session.canvasData,
      metadata: session.metadata,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    // 파일 정보 추가
    if (session.coverFile) {
      response.coverFile = this.toFileInfoDto(session.coverFile);
    }
    if (session.contentFile) {
      response.contentFile = this.toFileInfoDto(session.contentFile);
    }

    return response;
  }

  private toFileInfoDto(file: any): FileInfoDto {
    return {
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      thumbnailUrl: file.thumbnailUrl,
      fileSize: Number(file.fileSize),
      mimeType: file.mimeType,
    };
  }
}
