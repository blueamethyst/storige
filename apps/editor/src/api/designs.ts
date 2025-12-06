import { apiClient } from './client';
import type {
  EditorDesign,
  CreateEditorDesignInput,
  UpdateEditorDesignInput,
  PaginatedResponse,
  ApiResponse,
} from '@storige/types';

export const designsApi = {
  getMyDesigns: async (params?: { page?: number; pageSize?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<EditorDesign>>>(
      '/editor-designs',
      { params }
    );
    return response.data;
  },

  getDesign: async (id: string) => {
    const response = await apiClient.get<ApiResponse<EditorDesign>>(
      `/editor-designs/${id}`
    );
    return response.data;
  },

  createDesign: async (data: CreateEditorDesignInput) => {
    const response = await apiClient.post<ApiResponse<EditorDesign>>(
      '/editor-designs',
      data
    );
    return response.data;
  },

  updateDesign: async (id: string, data: UpdateEditorDesignInput) => {
    const response = await apiClient.put<ApiResponse<EditorDesign>>(
      `/editor-designs/${id}`,
      data
    );
    return response.data;
  },

  deleteDesign: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/editor-designs/${id}`
    );
    return response.data;
  },
};
