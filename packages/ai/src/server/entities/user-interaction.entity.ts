import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 상호작용 타입 enum
 */
export enum InteractionType {
  VIEW = 'view', // 템플릿 조회
  SELECT = 'select', // 템플릿 선택
  EDIT = 'edit', // 편집 시작
  COMPLETE = 'complete', // 편집 완료
  ABANDON = 'abandon', // 편집 포기
}

/**
 * 피드백 타입 enum
 */
export enum FeedbackType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

/**
 * 사용자 상호작용 엔티티
 * 추천 모델 개선을 위한 사용자 행동 데이터 수집
 */
@Entity('user_interactions')
@Index('idx_user_interaction_user', ['userId'])
@Index('idx_user_interaction_template_set', ['templateSetId'])
@Index('idx_user_interaction_type', ['interactionType'])
export class UserInteraction {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ name: 'template_set_id', type: 'varchar', length: 36 })
  templateSetId!: string;

  @Column({
    name: 'interaction_type',
    type: 'varchar',
    length: 20,
  })
  interactionType!: InteractionType;

  // 상호작용 상세 정보
  @Column({ type: 'int', nullable: true })
  duration!: number; // 초 단위

  @Column({ name: 'edit_actions', type: 'int', nullable: true })
  editActions!: number; // 편집 액션 수

  // 컨텍스트 정보
  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: 'recommendation' | 'search' | 'browse' | 'generation' | null;

  @Column({ name: 'recommendation_rank', type: 'int', nullable: true })
  recommendationRank!: number | null; // 추천 목록에서의 순위

  @Column({ name: 'recommendation_score', type: 'float', nullable: true })
  recommendationScore!: number | null; // 추천 점수

  // 피드백 (선택적)
  @Column({ type: 'int', nullable: true })
  rating!: number; // 1-5

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  feedback!: FeedbackType | null;

  @Column({ name: 'feedback_comment', type: 'text', nullable: true })
  feedbackComment!: string | null;

  // 세션 정보
  @Column({ name: 'session_id', type: 'varchar', length: 36, nullable: true })
  sessionId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
