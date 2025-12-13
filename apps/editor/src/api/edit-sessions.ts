import { apiClient } from './client'

/**
 * Edit Session 상태 (bookmoa 연동용)
 */
export type SessionStatus = 'draft' | 'editing' | 'complete'

/**
 * Edit Session 모드
 */
export type SessionMode = 'cover' | 'content' | 'both' | 'template'

/**
 * File 정보 DTO
 */
export interface FileInfoDto {
  id: string
  fileName: string
  originalName: string
  thumbnailUrl?: string | null
  fileSize: number
  mimeType: string
}

/**
 * Edit Session 응답 DTO
 */
export interface EditSessionResponse {
  id: string
  orderSeqno: number
  memberSeqno: number
  status: SessionStatus
  mode: SessionMode
  coverFileId?: string | null
  coverFile?: FileInfoDto | null
  contentFileId?: string | null
  contentFile?: FileInfoDto | null
  templateSetId?: string | null
  canvasData?: any
  metadata?: Record<string, any> | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Edit Session 생성 요청 DTO
 */
export interface CreateEditSessionRequest {
  orderSeqno: number
  mode: SessionMode
  coverFileId?: string
  contentFileId?: string
  templateSetId?: string
  canvasData?: any
  metadata?: Record<string, any>
}

/**
 * Edit Session 업데이트 요청 DTO
 */
export interface UpdateEditSessionRequest {
  status?: SessionStatus
  coverFileId?: string
  contentFileId?: string
  templateSetId?: string
  canvasData?: any
  metadata?: Record<string, any>
}

/**
 * Edit Sessions API (bookmoa 연동용)
 */
export const editSessionsApi = {
  /**
   * 편집 세션 생성
   */
  create: async (payload: CreateEditSessionRequest): Promise<EditSessionResponse> => {
    const response = await apiClient.post<EditSessionResponse>('/edit-sessions', payload)
    return response.data
  },

  /**
   * 편집 세션 조회
   */
  get: async (id: string): Promise<EditSessionResponse> => {
    const response = await apiClient.get<EditSessionResponse>(`/edit-sessions/${id}`)
    return response.data
  },

  /**
   * 주문별 세션 목록 조회
   */
  findByOrder: async (orderSeqno: number): Promise<{ sessions: EditSessionResponse[]; total: number }> => {
    const response = await apiClient.get<{ sessions: EditSessionResponse[]; total: number }>(
      '/edit-sessions',
      { params: { orderSeqno } }
    )
    return response.data
  },

  /**
   * 편집 세션 업데이트
   */
  update: async (id: string, payload: UpdateEditSessionRequest): Promise<EditSessionResponse> => {
    const response = await apiClient.patch<EditSessionResponse>(`/edit-sessions/${id}`, payload)
    return response.data
  },

  /**
   * 편집 세션 완료 처리
   */
  complete: async (id: string): Promise<EditSessionResponse> => {
    const response = await apiClient.patch<EditSessionResponse>(`/edit-sessions/${id}/complete`, {})
    return response.data
  },

  /**
   * 편집 세션 삭제
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/edit-sessions/${id}`)
    return response.data
  },

  /**
   * 내 세션 목록 조회 (현재 사용자 기준)
   */
  getMySessions: async (): Promise<{ sessions: EditSessionResponse[]; total: number }> => {
    const response = await apiClient.get<{ sessions: EditSessionResponse[]; total: number }>(
      '/edit-sessions'
    )
    return response.data
  },
}
