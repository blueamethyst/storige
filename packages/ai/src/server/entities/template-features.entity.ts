import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 템플릿 특성 엔티티
 * ML 기반 추천을 위한 템플릿 특성 벡터 및 메타데이터 저장
 */
@Entity('template_features')
export class TemplateFeatures {
  @PrimaryColumn('varchar', { length: 36 })
  templateId!: string;

  // 색상 분석
  @Column({ type: 'json', nullable: true })
  dominantColors!: string[]; // ['#3B82F6', '#1F2937', '#FFFFFF']

  @Column({ type: 'int', default: 0 })
  colorCount!: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  colorHarmony!: 'monochrome' | 'complementary' | 'analogous' | 'triadic' | null;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  colorTone!: 'warm' | 'cool' | 'neutral' | null;

  // 레이아웃 분석
  @Column({ type: 'int', default: 0 })
  elementCount!: number;

  @Column({ type: 'float', default: 0 })
  textRatio!: number; // 0-1

  @Column({ type: 'float', default: 0 })
  imageRatio!: number; // 0-1

  @Column({ type: 'float', default: 0 })
  whitespaceRatio!: number; // 0-1

  @Column({ type: 'float', default: 0 })
  symmetry!: number; // 0-1

  // 스타일 분류
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  complexity!: 'minimal' | 'moderate' | 'complex' | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  mood!: 'professional' | 'casual' | 'playful' | 'elegant' | null;

  @Column({ type: 'json', nullable: true })
  styleLabels!: string[]; // ['minimal', 'corporate', 'modern']

  @Column({ type: 'json', nullable: true })
  industryLabels!: string[]; // ['tech', 'education', 'retail']

  // ML 임베딩 벡터 (128차원)
  @Column({ type: 'json', nullable: true })
  featureVector!: number[];

  // 통계
  @Column({ type: 'int', default: 0 })
  selectionCount!: number;

  @Column({ type: 'float', default: 0 })
  avgRating!: number;

  @Column({ type: 'float', default: 0 })
  completionRate!: number; // 선택 후 최종 제출률

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
