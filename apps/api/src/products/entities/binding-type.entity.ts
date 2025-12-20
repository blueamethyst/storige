import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 제본 방식 엔티티
 * 책등 폭 계산에 사용되는 제본 방식과 여유분 정보를 관리
 */
@Entity('binding_types')
export class BindingTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string; // 'perfect', 'saddle', 'spiral', 'hardcover'

  @Column({ length: 100 })
  name: string; // '무선제본', '중철제본' 등

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  margin: number; // 제본 여유분 (mm)

  @Column({ type: 'int', nullable: true })
  minPages: number; // 최소 페이지 수 (null = 제한없음)

  @Column({ type: 'int', nullable: true })
  maxPages: number; // 최대 페이지 수 (null = 제한없음)

  @Column({ type: 'int', nullable: true })
  pageMultiple: number; // 페이지 배수 (4의 배수 등)

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
