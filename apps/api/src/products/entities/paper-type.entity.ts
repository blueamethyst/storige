import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 종이 타입 엔티티
 * 책등 폭 계산에 사용되는 종이 종류와 두께 정보를 관리
 */
@Entity('paper_types')
export class PaperTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string; // 'mojo_70g', 'mojo_80g', 'art_200g' 등

  @Column({ length: 100 })
  name: string; // '모조지 70g', '모조지 80g' 등

  @Column({ type: 'decimal', precision: 5, scale: 3 })
  thickness: number; // mm per sheet (0.09, 0.10, 0.18 등)

  @Column({ length: 20, default: 'body' })
  category: string; // 'body' (본문용) | 'cover' (표지용)

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
