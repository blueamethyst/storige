import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * bookmoa member 테이블 매핑 (읽기 전용)
 * 실제 테이블 구조에 맞게 수정이 필요할 수 있습니다.
 */
@Entity('member')
export class BookmoaMemberEntity {
  @PrimaryColumn({ name: 'member_seqno', type: 'bigint' })
  seqno: number;

  @Column({ name: 'member_id', length: 100 })
  memberId: string;

  @Column({ name: 'member_name', length: 100, nullable: true })
  memberName: string;

  @Column({ name: 'mail', length: 100, nullable: true })
  email: string;

  @Column({ name: 'tel_num', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'cell_num', length: 20, nullable: true })
  mobile: string;

  @Column({ name: 'member_typ', length: 10, nullable: true })
  memberType: string;

  @Column({ name: 'is_login', length: 1, nullable: true })
  isLogin: string;

  @Column({ name: 'withdraw_yn', length: 1, default: 'N' })
  withdrawYn: string;

  @Column({ name: 'regi_date', type: 'datetime', nullable: true })
  regiDate: Date;
}
