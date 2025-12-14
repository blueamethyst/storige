import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * bookmoa cate 테이블 매핑 (읽기 전용)
 * 상품 카테고리 정보를 담고 있습니다.
 * depth는 sortcode 길이로 계산 (3자리씩 = 1단계)
 */
@Entity('cate')
export class BookmoaCategoryEntity {
  @PrimaryColumn({ name: 'sortcode', type: 'varchar', length: 20 })
  sortcode: string;

  @Column({ name: 'cate_name', type: 'varchar', length: 200 })
  cateName: string;

  @Column({ name: 'use_yn', type: 'char', length: 1, default: 'Y' })
  useYn: string;

  // depth는 sortcode 길이로 계산 (001 = 1, 001001 = 2, 001001001 = 3)
  get depth(): number {
    return Math.floor(this.sortcode.length / 3);
  }
}
