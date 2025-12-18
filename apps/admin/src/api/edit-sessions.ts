import { axiosInstance } from '../lib/axios';

export type SessionStatus = 'draft' | 'completed';
export type SessionMode = 'upload' | 'editor';

export interface FileInfo {
  id: string;
  fileName: string;
  originalName: string;
  thumbnailUrl?: string | null;
  fileSize: number;
  mimeType: string;
}

export interface EditSessionResponse {
  id: string;
  orderSeqno: number;
  memberSeqno: number;
  status: SessionStatus;
  mode: SessionMode;
  coverFileId?: string | null;
  coverFile?: FileInfo | null;
  contentFileId?: string | null;
  contentFile?: FileInfo | null;
  templateSetId?: string | null;
  canvasData?: any;
  metadata?: Record<string, any> | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditSessionListResponse {
  sessions: EditSessionResponse[];
  total: number;
}

export interface EditSessionQueryParams {
  orderSeqno?: number;
  memberSeqno?: number;
  status?: SessionStatus;
  page?: number;
  limit?: number;
}

export const editSessionsApi = {
  getAll: async (params?: EditSessionQueryParams): Promise<EditSessionListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.orderSeqno) searchParams.append('orderSeqno', String(params.orderSeqno));
    if (params?.memberSeqno) searchParams.append('memberSeqno', String(params.memberSeqno));
    const response = await axiosInstance.get<EditSessionListResponse>(
      `/edit-sessions?${searchParams.toString()}`
    );
    return response.data;
  },

  getById: async (id: string): Promise<EditSessionResponse> => {
    const response = await axiosInstance.get<EditSessionResponse>(`/edit-sessions/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await axiosInstance.delete<{ success: boolean }>(`/edit-sessions/${id}`);
    return response.data;
  },

  complete: async (id: string): Promise<EditSessionResponse> => {
    const response = await axiosInstance.patch<EditSessionResponse>(`/edit-sessions/${id}/complete`);
    return response.data;
  },
};
