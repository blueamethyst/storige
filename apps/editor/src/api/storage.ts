import { apiClient } from './client';
import type { ApiResponse } from '@storige/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
}

export const storageApi = {
  uploadDesign: async (file: File | Blob, filename?: string) => {
    const formData = new FormData();
    formData.append('file', file, filename);

    const response = await apiClient.post<ApiResponse<UploadedFile>>(
      '/storage/upload/designs',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getDesignUrl: (filename: string) => {
    return `${API_BASE_URL}/storage/designs/${filename}`;
  },

  deleteDesign: async (filename: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/storage/designs/${filename}`
    );
    return response.data;
  },

  // 일반 파일 업로드 (templates, library, uploads, temp)
  uploadFile: async (
    file: File | Blob,
    category: 'templates' | 'library' | 'uploads' | 'temp' = 'uploads'
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiResponse<UploadedFile>>(
      `/storage/upload?category=${category}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  getFileUrl: (category: string, filename: string) => {
    return `${API_BASE_URL}/storage/files/${category}/${filename}`;
  },
};
