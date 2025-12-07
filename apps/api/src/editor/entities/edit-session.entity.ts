import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../auth/entities/user.entity';
import { Template } from '../../templates/entities/template.entity';
import { TemplateSet } from '../../templates/entities/template-set.entity';
import type { CanvasData, EditPage, EditStatus } from '@storige/types';

/**
 * 편집 상태 enum (DB용)
 * - draft: 편집 중 (고객 편집 가능)
 * - review: 검토 중 (관리자 편집 가능)
 * - submitted: 완료 (관리자 편집 가능, 기록 남김)
 */
export enum EditSessionStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  SUBMITTED = 'submitted',
  // Legacy
  COMPLETED = 'COMPLETED',
}

@Entity('edit_sessions')
@Index('idx_edit_session_status', ['status'])
@Index('idx_edit_session_user', ['userId'])
@Index('idx_edit_session_order', ['orderId'])
export class EditSession {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @Column({ name: 'order_id', type: 'varchar', length: 36, nullable: true })
  orderId: string | null;

  @Column({ name: 'template_set_id', type: 'varchar', length: 36, nullable: true })
  templateSetId: string | null;

  /**
   * 페이지별 캔버스 데이터
   */
  @Column({ type: 'json', nullable: true })
  pages: EditPage[] | null;

  /**
   * 편집 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: EditSessionStatus.DRAFT,
  })
  status: EditStatus;

  /**
   * 편집 잠금 - 현재 편집 중인 사용자 ID
   */
  @Column({ name: 'locked_by', type: 'varchar', length: 36, nullable: true })
  lockedBy: string | null;

  /**
   * 편집 잠금 시작 시간
   */
  @Column({ name: 'locked_at', type: 'datetime', nullable: true })
  lockedAt: Date | null;

  /**
   * 마지막 수정자 ID
   */
  @Column({ name: 'modified_by', type: 'varchar', length: 36, nullable: true })
  modifiedBy: string | null;

  /**
   * 마지막 수정 시간
   */
  @Column({ name: 'modified_at', type: 'datetime', nullable: true })
  modifiedAt: Date | null;

  // Legacy fields (하위 호환)
  @Column({ name: 'template_id', type: 'varchar', length: 36, nullable: true })
  templateId: string | null;

  @Column({ name: 'canvas_data', type: 'json', nullable: true })
  canvasData: CanvasData | null;

  @Column({ name: 'order_options', type: 'json', nullable: true })
  orderOptions: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'locked_by' })
  lockedByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'modified_by' })
  modifiedByUser: User;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => TemplateSet, { nullable: true })
  @JoinColumn({ name: 'template_set_id' })
  templateSet: TemplateSet;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.status) {
      this.status = 'draft' as EditStatus;
    }
  }
}

/**
 * 편집 이력 entity
 */
@Entity('edit_histories')
@Index('idx_edit_history_session', ['sessionId'])
export class EditHistory {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  sessionId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @Column({ name: 'user_name', type: 'varchar', length: 100, nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => EditSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: EditSession;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
