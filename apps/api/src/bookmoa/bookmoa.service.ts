import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookmoaMemberEntity } from '../bookmoa-entities/member.entity';
import { BookmoaOrderEntity } from '../bookmoa-entities/order.entity';

/**
 * Bookmoa 서비스
 * bookmoa 쇼핑몰 데이터를 조회합니다 (읽기 전용).
 */
@Injectable()
export class BookmoaService {
  constructor(
    @InjectRepository(BookmoaMemberEntity, 'bookmoa')
    private memberRepository: Repository<BookmoaMemberEntity>,

    @InjectRepository(BookmoaOrderEntity, 'bookmoa')
    private orderRepository: Repository<BookmoaOrderEntity>,
  ) {}

  /**
   * 회원 번호로 회원 정보 조회
   */
  async findMemberBySeqno(seqno: number): Promise<BookmoaMemberEntity | null> {
    return this.memberRepository.findOne({
      where: { seqno },
    });
  }

  /**
   * 회원 ID로 회원 정보 조회
   */
  async findMemberById(memberId: string): Promise<BookmoaMemberEntity | null> {
    return this.memberRepository.findOne({
      where: { memberId },
    });
  }

  /**
   * 주문 번호로 주문 정보 조회
   */
  async findOrderBySeqno(seqno: number): Promise<BookmoaOrderEntity | null> {
    return this.orderRepository.findOne({
      where: { seqno },
    });
  }

  /**
   * 주문 번호(문자열)로 주문 정보 조회
   */
  async findOrderByOrderNum(orderNum: string): Promise<BookmoaOrderEntity | null> {
    return this.orderRepository.findOne({
      where: { orderNum },
    });
  }

  /**
   * 회원의 주문 목록 조회
   */
  async findOrdersByMemberSeqno(memberSeqno: number): Promise<BookmoaOrderEntity[]> {
    return this.orderRepository.find({
      where: { memberSeqno },
      order: { regiDate: 'DESC' },
    });
  }

  /**
   * 주문의 제품 옵션 정보 조회 (편집기 초기화용)
   */
  async getOrderOptions(orderSeqno: number): Promise<{
    size: { width: number; height: number };
    pages: number;
    binding: string;
    bleed: number;
    paperThickness: number;
  } | null> {
    const order = await this.findOrderBySeqno(orderSeqno);

    if (!order) {
      return null;
    }

    return {
      size: {
        width: order.cutWidSize || 0,
        height: order.cutVertSize || 0,
      },
      pages: order.pageCnt || 0,
      binding: order.bindingTyp || 'perfect',
      bleed: order.tomsonSize || 3,
      paperThickness: order.paperThick || 0.1,
    };
  }
}
