import { apiClient } from './client';
import type {
  EditorContent,
  EditorContentFilter,
  PaginatedResponse,
  ApiResponse,
} from '@storige/types';

interface ContentQueryParams extends EditorContentFilter {
  page?: number;
  pageSize?: number;
  sortField?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const contentsApi = {
  getTemplates: async (params?: ContentQueryParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<EditorContent>>>(
      '/editor-contents/templates',
      { params }
    );
    return response.data;
  },

  getFrames: async (params?: ContentQueryParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<EditorContent>>>(
      '/editor-contents/frames',
      { params }
    );
    return response.data;
  },

  getImages: async (params?: ContentQueryParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<EditorContent>>>(
      '/editor-contents/images',
      { params }
    );
    return response.data;
  },

  getBackgrounds: async (params?: ContentQueryParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<EditorContent>>>(
      '/editor-contents/backgrounds',
      { params }
    );
    return response.data;
  },

  getElements: async (params?: ContentQueryParams) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<EditorContent>>>(
      '/editor-contents/elements',
      { params }
    );
    return response.data;
  },

  getContent: async (id: string) => {
    const response = await apiClient.get<ApiResponse<EditorContent>>(
      `/editor-contents/${id}`
    );
    return response.data;
  },
};
