/**
 * Spine Calculator API Client
 * 책등 폭 계산 및 용지/제본 정보 조회
 */
import { apiClient } from './client';

// 책등 계산 요청 파라미터
export interface CalculateSpineParams {
  pageCount: number;       // 페이지 수
  paperType: string;       // 용지 종류 코드
  bindingType: string;     // 제본 방식 코드
  customPaperThickness?: number;  // 커스텀 용지 두께 (mm)
  customBindingMargin?: number;   // 커스텀 제본 마진 (mm)
}

// 책등 계산 결과
export interface SpineCalculationResult {
  spineWidth: number;      // 계산된 책등 너비 (mm)
  paperThickness: number;  // 사용된 용지 두께 (mm)
  bindingMargin: number;   // 사용된 제본 마진 (mm)
  warnings: Array<{ code: string; message: string }>;  // 경고 메시지
  formula: string;         // 계산 공식
}

// 용지 정보
export interface PaperTypeInfo {
  code: string;            // 용지 코드
  name: string;            // 용지 이름
  thickness: number;       // 두께 (mm)
  category: string;        // body (본문용) | cover (표지용)
}

// 제본 정보
export interface BindingTypeInfo {
  code: string;            // 제본 코드
  name: string;            // 제본 이름
  margin: number;          // 제본 마진 (mm)
  minPages?: number;       // 최소 페이지 수
  maxPages?: number;       // 최대 페이지 수
  pageMultiple?: number;   // 페이지 배수
}

export const spineApi = {
  /**
   * 책등 폭 계산
   */
  async calculate(params: CalculateSpineParams): Promise<SpineCalculationResult> {
    const response = await apiClient.post<SpineCalculationResult>(
      '/products/spine/calculate',
      params
    );
    return response.data;
  },

  /**
   * 사용 가능한 용지 종류 목록 조회
   */
  async getPaperTypes(): Promise<PaperTypeInfo[]> {
    const response = await apiClient.get<PaperTypeInfo[]>('/products/spine/paper-types');
    return response.data;
  },

  /**
   * 사용 가능한 제본 방식 목록 조회
   */
  async getBindingTypes(): Promise<BindingTypeInfo[]> {
    const response = await apiClient.get<BindingTypeInfo[]>('/products/spine/binding-types');
    return response.data;
  },
};
