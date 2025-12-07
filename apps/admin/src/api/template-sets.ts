import { axiosInstance } from '../lib/axios';
import {
  TemplateSet,
  TemplateSetType,
  TemplateRef,
  CreateTemplateSetInput,
  UpdateTemplateSetInput,
  PaginatedResponse,
} from '@storige/types';

export interface TemplateSetQueryParams {
  type?: TemplateSetType;
  categoryId?: string;
  isDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

export const templateSetsApi = {
  /**
   * 템플릿셋 목록 조회
   */
  getAll: async (params?: TemplateSetQueryParams): Promise<TemplateSet[]> => {
    const response = await axiosInstance.get<PaginatedResponse<TemplateSet>>('/template-sets', { params });
    return response.data.items;
  },

  /**
   * 템플릿셋 상세 조회
   */
  getById: async (id: string): Promise<TemplateSet> => {
    const response = await axiosInstance.get<TemplateSet>(`/template-sets/${id}`);
    return response.data;
  },

  /**
   * 템플릿셋 생성
   */
  create: async (data: CreateTemplateSetInput): Promise<TemplateSet> => {
    const response = await axiosInstance.post<TemplateSet>('/template-sets', data);
    return response.data;
  },

  /**
   * 템플릿셋 수정
   */
  update: async (id: string, data: UpdateTemplateSetInput): Promise<TemplateSet> => {
    const response = await axiosInstance.put<TemplateSet>(`/template-sets/${id}`, data);
    return response.data;
  },

  /**
   * 템플릿셋 삭제 (소프트 삭제)
   */
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/template-sets/${id}`);
  },

  /**
   * 템플릿셋 복제
   */
  copy: async (id: string): Promise<TemplateSet> => {
    const response = await axiosInstance.post<TemplateSet>(`/template-sets/${id}/copy`);
    return response.data;
  },

  /**
   * 템플릿 구성 수정 (순서 포함)
   */
  updateTemplates: async (id: string, templates: TemplateRef[]): Promise<TemplateSet> => {
    const response = await axiosInstance.put<TemplateSet>(
      `/template-sets/${id}/templates`,
      { templates }
    );
    return response.data;
  },

  /**
   * 템플릿 추가
   */
  addTemplate: async (
    id: string,
    templateId: string,
    required: boolean = false
  ): Promise<TemplateSet> => {
    const response = await axiosInstance.post<TemplateSet>(
      `/template-sets/${id}/templates`,
      { templateId, required }
    );
    return response.data;
  },

  /**
   * 템플릿 제거
   */
  removeTemplate: async (id: string, templateId: string): Promise<TemplateSet> => {
    const response = await axiosInstance.delete<TemplateSet>(
      `/template-sets/${id}/templates/${templateId}`
    );
    return response.data;
  },

  /**
   * 연결된 상품 목록 조회
   */
  getProducts: async (id: string): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>(`/template-sets/${id}/products`);
    return response.data;
  },
};
