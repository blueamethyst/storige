import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * bookmoa order_common 테이블 매핑 (읽기 전용)
 * 실제 테이블 구조에 맞게 수정이 필요할 수 있습니다.
 */
@Entity('order_common')
export class BookmoaOrderEntity {
  @PrimaryColumn({ name: 'order_common_seqno', type: 'bigint' })
  seqno: number;

  @Column({ name: 'member_seqno', type: 'bigint' })
  memberSeqno: number;

  @Column({ name: 'order_num', length: 50, nullable: true })
  orderNum: string;

  @Column({ name: 'order_detail', length: 500, nullable: true })
  orderDetail: string;

  @Column({ name: 'order_state', length: 10, nullable: true })
  orderState: string;

  @Column({ name: 'cate_name', length: 100, nullable: true })
  cateName: string;

  @Column({ name: 'amt', type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({ name: 'pay_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  payPrice: number;

  @Column({ name: 'cut_wid_size', type: 'decimal', precision: 10, scale: 2, nullable: true })
  cutWidSize: number;

  @Column({ name: 'cut_vert_size', type: 'decimal', precision: 10, scale: 2, nullable: true })
  cutVertSize: number;

  @Column({ name: 'page_cnt', type: 'int', nullable: true })
  pageCnt: number;

  @Column({ name: 'binding_typ', length: 20, nullable: true })
  bindingTyp: string;

  @Column({ name: 'tomson_size', type: 'decimal', precision: 10, scale: 2, nullable: true })
  tomsonSize: number;

  @Column({ name: 'paper_thick', type: 'decimal', precision: 10, scale: 4, nullable: true })
  paperThick: number;

  @Column({ name: 'file_upload_yn', length: 1, default: 'N' })
  fileUploadYn: string;

  @Column({ name: 'storige_session_id', length: 36, nullable: true })
  storigeSessionId: string;

  @Column({ name: 'editor_completed_at', type: 'datetime', nullable: true })
  editorCompletedAt: Date;

  @Column({ name: 'regi_date', type: 'datetime', nullable: true })
  regiDate: Date;

  @Column({ name: 'modi_date', type: 'datetime', nullable: true })
  modiDate: Date;
}
