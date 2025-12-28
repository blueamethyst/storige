/**
 * 테스트용 EditSession 엔티티
 * SQLite에서 enum과 ManyToOne 관계 문제를 피하기 위해 단순화된 버전
 */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum SessionStatus {
  DRAFT = 'draft',
  EDITING = 'editing',
  COMPLETE = 'complete',
}

export enum SessionMode {
  COVER = 'cover',
  CONTENT = 'content',
  BOTH = 'both',
  TEMPLATE = 'template',
}

export enum WorkerStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  VALIDATED = 'validated',
  FAILED = 'failed',
}

@Entity('file_edit_sessions')
export class TestEditSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_seqno', type: 'integer' })
  orderSeqno: number;

  @Column({ name: 'member_seqno', type: 'integer' })
  memberSeqno: number;

  @Column({
    type: 'text',
    default: SessionStatus.DRAFT,
  })
  status: SessionStatus;

  @Column({
    type: 'text',
  })
  mode: SessionMode;

  @Column({ name: 'cover_file_id', type: 'varchar', length: 36, nullable: true })
  coverFileId: string | null;

  @Column({ name: 'content_file_id', type: 'varchar', length: 36, nullable: true })
  contentFileId: string | null;

  @Column({ name: 'template_set_id', type: 'varchar', length: 36, nullable: true })
  templateSetId: string | null;

  @Column({ name: 'canvas_data', type: 'simple-json', nullable: true })
  canvasData: any;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({
    name: 'worker_status',
    type: 'text',
    nullable: true,
  })
  workerStatus: WorkerStatus | null;

  @Column({ name: 'worker_error', type: 'text', nullable: true })
  workerError: string | null;

  @Column({ name: 'callback_url', type: 'varchar', length: 500, nullable: true })
  callbackUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
