import { apiClient } from './client';
import type { CanvasData } from '@storige/types';

export interface Template {
  id: string;
  name: string;
  categoryId: string;
  thumbnailUrl: string | null;
  canvasData: CanvasData;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  children?: Category[];
}

export const templatesApi = {
  /**
   * Get all templates
   */
  getTemplates: async (params?: {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<Template[]>('/templates', { params });
    return response.data;
  },

  /**
   * Get template by ID
   */
  getTemplate: async (id: string) => {
    const response = await apiClient.get<Template>(`/templates/${id}`);
    return response.data;
  },

  /**
   * Get categories tree
   */
  getCategories: async () => {
    const response = await apiClient.get<Category[]>('/categories');
    return response.data;
  },

  /**
   * Get templates by category
   */
  getTemplatesByCategory: async (categoryId: string) => {
    const response = await apiClient.get<Template[]>(`/templates`, {
      params: { categoryId },
    });
    return response.data;
  },
};
