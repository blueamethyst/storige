import { axiosInstance } from '../lib/axios';
import { EditSession, EditStatus, EditHistory } from '@storige/types';

export interface ReviewQueryParams {
  status?: EditStatus;
  userId?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
}

export interface ReviewAction {
  status: EditStatus;
  comment?: string;
}

export const reviewsApi = {
  /**
   * 검토 대기 목록 조회
   */
  getAll: async (params?: ReviewQueryParams): Promise<{ items: EditSession[]; total: number }> => {
    const response = await axiosInstance.get<{ items: EditSession[]; total: number }>(
      '/editor/sessions',
      { params }
    );
    return response.data;
  },

  /**
   * 검토 상세 조회
   */
  getById: async (id: string): Promise<EditSession> => {
    const response = await axiosInstance.get<EditSession>(`/editor/sessions/${id}`);
    return response.data;
  },

  /**
   * 수정 이력 조회
   */
  getHistory: async (id: string): Promise<EditHistory[]> => {
    const response = await axiosInstance.get<EditHistory[]>(`/editor/sessions/${id}/history`);
    return response.data;
  },

  /**
   * 상태 변경 (승인/반려)
   */
  changeStatus: async (id: string, action: ReviewAction, userId: string): Promise<EditSession> => {
    const response = await axiosInstance.put<EditSession>(
      `/editor/sessions/${id}/status`,
      action,
      { headers: { 'X-User-Id': userId } }
    );
    return response.data;
  },

  /**
   * 에디터에서 열기 (잠금 획득)
   */
  openInEditor: async (id: string, userId: string): Promise<EditSession> => {
    const response = await axiosInstance.post<EditSession>(
      `/editor/sessions/${id}/lock`,
      { userId }
    );
    return response.data;
  },

  /**
   * 페이지 썸네일 목록 조회
   */
  getPageThumbnails: async (id: string): Promise<{ pageId: string; url: string }[]> => {
    const response = await axiosInstance.get<{ pageId: string; url: string }[]>(
      `/editor/sessions/${id}/thumbnails`
    );
    return response.data;
  },
};
