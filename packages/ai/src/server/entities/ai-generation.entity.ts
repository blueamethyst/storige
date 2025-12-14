import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 생성 옵션 인터페이스
 */
export interface GenerationOptions {
  templateType: 'book' | 'leaflet';
  pageCount: number;
  style: 'minimal' | 'modern' | 'elegant' | 'playful' | 'professional';
  colorScheme: string;
  dimensions: {
    width: number;
    height: number;
  };
  includeImages: boolean;
  industryCategory?: string;
}

/**
 * 생성 상태 enum
 */
export enum GenerationStatus {
  PENDING = 'pending',
  LAYOUT = 'layout', // LLM 레이아웃 생성 중
  IMAGES = 'images', // 이미지 생성 중
  ASSEMBLY = 'assembly', // 템플릿 조립 중
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * AI 생성 기록 엔티티
 * 템플릿 생성 요청 및 결과 추적
 */
@Entity('ai_generations')
@Index('idx_ai_generation_user', ['userId'])
@Index('idx_ai_generation_status', ['status'])
export class AiGeneration {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  // 입력
  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'json' })
  options!: GenerationOptions;

  // 출력
  @Column({
    name: 'generated_template_set_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  generatedTemplateSetId!: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 500, nullable: true })
  thumbnailUrl!: string | null;

  // 상태
  @Column({
    type: 'varchar',
    length: 20,
    default: GenerationStatus.PENDING,
  })
  status!: GenerationStatus;

  @Column({ type: 'int', default: 0 })
  progress!: number; // 0-100

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  // 메타데이터
  @Column({ name: 'model_version', type: 'varchar', length: 50, nullable: true })
  modelVersion!: string | null;

  @Column({ name: 'llm_model', type: 'varchar', length: 50, nullable: true })
  llmModel!: string | null;

  @Column({ name: 'image_model', type: 'varchar', length: 50, nullable: true })
  imageModel!: string | null;

  @Column({ name: 'processing_time_ms', type: 'int', nullable: true })
  processingTimeMs!: number | null;

  // 비용 추적
  @Column({ name: 'llm_tokens_used', type: 'int', nullable: true })
  llmTokensUsed!: number | null;

  @Column({ name: 'images_generated', type: 'int', nullable: true })
  imagesGenerated!: number | null;

  @Column({ name: 'estimated_cost_usd', type: 'float', nullable: true })
  estimatedCostUsd!: number | null;

  // 사용자 피드백
  @Column({ name: 'user_accepted', type: 'boolean', nullable: true })
  userAccepted!: boolean | null;

  @Column({ name: 'user_rating', type: 'int', nullable: true })
  userRating!: number | null; // 1-5

  @Column({ name: 'user_feedback', type: 'text', nullable: true })
  userFeedback!: string | null;

  // 레이아웃 계획 (LLM 응답 저장)
  @Column({ name: 'layout_plan', type: 'json', nullable: true })
  layoutPlan!: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
