import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * bookmoa cate 테이블 매핑 (읽기 전용)
 * 상품 카테고리 정보를 담고 있습니다.
 */
@Entity('cate')
export class BookmoaCategoryEntity {
  @PrimaryColumn({ name: 'sortcode', type: 'varchar', length: 20 })
  sortcode: string;

  @Column({ name: 'cate_name', type: 'varchar', length: 200 })
  cateName: string;

  @Column({ name: 'depth', type: 'int' })
  depth: number;

  @Column({ name: 'use_yn', type: 'char', length: 1, default: 'Y' })
  useYn: string;
}
