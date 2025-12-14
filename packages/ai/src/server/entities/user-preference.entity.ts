import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 색상 팔레트 인터페이스
 */
export interface ColorPalette {
  primary?: string;
  secondary?: string[];
  accent?: string;
}

/**
 * 사용자 선호도 엔티티
 * 개인화 추천을 위한 사용자 취향 데이터 저장
 */
@Entity('user_preferences')
export class UserPreference {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  // 명시적 선호도
  @Column({ type: 'json', nullable: true })
  preferredStyles!: string[]; // ['minimal', 'modern', 'elegant']

  @Column({ type: 'json', nullable: true })
  preferredColors!: ColorPalette;

  @Column({ type: 'json', nullable: true })
  preferredFonts!: string[]; // ['Noto Sans KR', 'Pretendard']

  @Column({ type: 'varchar', length: 50, nullable: true })
  industryCategory!: string; // 'technology', 'education', 'food'

  @Column({ type: 'varchar', length: 50, nullable: true })
  usageContext!: string; // 'business', 'personal', 'academic'

  @Column({ type: 'varchar', length: 20, nullable: true })
  preferredComplexity!: 'minimal' | 'moderate' | 'complex' | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  preferredMood!: 'professional' | 'casual' | 'playful' | 'elegant' | null;

  // 암시적 선호도 (ML 임베딩)
  @Column({ type: 'json', nullable: true })
  preferenceVector!: number[]; // 128차원 벡터

  // 선호도 강도 (각 항목별 가중치)
  @Column({ type: 'json', nullable: true })
  weights!: {
    style?: number;
    color?: number;
    layout?: number;
    industry?: number;
  };

  // 온보딩 완료 여부
  @Column({ type: 'boolean', default: false })
  onboardingCompleted!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
