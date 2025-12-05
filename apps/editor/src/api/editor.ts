import { apiClient } from './client';
import type { CanvasData } from '@storige/types';

export interface EditSession {
  id: string;
  userId: string | null;
  templateId: string | null;
  canvasData: CanvasData;
  orderOptions: any | null;
  status: 'DRAFT' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionPayload {
  templateId?: string;
  canvasData?: CanvasData;
  orderOptions?: any;
}

export interface UpdateSessionPayload {
  canvasData: CanvasData;
  status?: 'DRAFT' | 'COMPLETED';
}

export const editorApi = {
  /**
   * Create a new edit session
   */
  createSession: async (payload: CreateSessionPayload) => {
    const response = await apiClient.post<EditSession>('/editor/sessions', payload);
    return response.data;
  },

  /**
   * Get edit session by ID
   */
  getSession: async (id: string) => {
    const response = await apiClient.get<EditSession>(`/editor/sessions/${id}`);
    return response.data;
  },

  /**
   * Update edit session (auto-save)
   */
  updateSession: async (id: string, payload: UpdateSessionPayload) => {
    const response = await apiClient.put<EditSession>(
      `/editor/sessions/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Export to PDF
   */
  exportPDF: async (canvasData: CanvasData) => {
    const response = await apiClient.post<{ url: string }>(
      '/editor/export',
      { canvasData },
      { responseType: 'blob' }
    );
    return response.data;
  },
};
