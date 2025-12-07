import { axiosInstance } from '../lib/axios';
import { Category } from '@storige/types';

export interface CreateCategoryDto {
  name: string;
  code: string;
  parentId?: string;
  level: 1 | 2 | 3;
  sortOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  code?: string;
  sortOrder?: number;
}

export interface ReorderCategoryItem {
  id: string;
  sortOrder: number;
}

export interface ReorderCategoriesDto {
  items: ReorderCategoryItem[];
}

export const categoriesApi = {
  getTree: async (): Promise<Category[]> => {
    const response = await axiosInstance.get<Category[]>('/categories/tree');
    return response.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await axiosInstance.get<Category>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await axiosInstance.post<Category>('/categories', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCategoryDto): Promise<Category> => {
    const response = await axiosInstance.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/categories/${id}`);
  },

  reorder: async (data: ReorderCategoriesDto): Promise<void> => {
    await axiosInstance.post('/categories/reorder', data);
  },
};
