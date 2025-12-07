import { Injectable } from '@nestjs/common';
import {
  PaperType,
  BindingType,
  PAPER_THICKNESS,
  BINDING_MARGIN,
  calculateSpineWidth,
  SpineCalculationResult,
} from '@storige/types';
import { CalculateSpineDto } from './dto/spine.dto';

@Injectable()
export class SpineService {
  /**
   * 책등 너비 계산
   */
  calculate(dto: CalculateSpineDto): SpineCalculationResult & { formula: string } {
    const result = calculateSpineWidth({
      pageCount: dto.pageCount,
      paperType: dto.paperType,
      bindingType: dto.bindingType,
    });

    // 커스텀 값이 있는 경우 재계산
    if (dto.customPaperThickness !== undefined || dto.customBindingMargin !== undefined) {
      const paperThickness = dto.customPaperThickness ?? result.paperThickness;
      const bindingMargin = dto.customBindingMargin ?? result.bindingMargin;
      const spineWidth = (dto.pageCount / 2) * paperThickness + bindingMargin;

      const formula = `(${dto.pageCount} / 2) × ${paperThickness} + ${bindingMargin} = ${spineWidth.toFixed(2)}mm`;

      return {
        spineWidth,
        paperThickness,
        bindingMargin,
        warnings: result.warnings,
        formula,
      };
    }

    const formula = `(${dto.pageCount} / 2) × ${result.paperThickness} + ${result.bindingMargin} = ${result.spineWidth.toFixed(2)}mm`;

    return {
      ...result,
      formula,
    };
  }

  /**
   * 용지 종류 목록
   */
  getPaperTypes() {
    const paperNames: Record<PaperType, string> = {
      [PaperType.MOJO_70G]: '모조지 70g',
      [PaperType.MOJO_80G]: '모조지 80g',
      [PaperType.SEOKJI_70G]: '서적지 70g',
      [PaperType.NEWSPRINT_45G]: '신문지 45g',
      [PaperType.ART_200G]: '아트지 200g',
      [PaperType.MATTE_200G]: '매트지 200g',
      [PaperType.CARD_300G]: '카드지 300g',
      [PaperType.KRAFT_120G]: '크라프트지 120g',
    };

    return Object.entries(PAPER_THICKNESS).map(([type, thickness]) => ({
      type,
      name: paperNames[type as PaperType] || type,
      thickness,
    }));
  }

  /**
   * 제본 방식 목록
   */
  getBindingTypes() {
    const bindingNames: Record<BindingType, string> = {
      [BindingType.PERFECT]: '무선제본',
      [BindingType.SADDLE]: '중철제본',
      [BindingType.SPIRAL]: '스프링제본',
      [BindingType.HARDCOVER]: '양장제본',
    };

    return Object.entries(BINDING_MARGIN).map(([type, margin]) => ({
      type,
      name: bindingNames[type as BindingType] || type,
      margin,
    }));
  }
}
