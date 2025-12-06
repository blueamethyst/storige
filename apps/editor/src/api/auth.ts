import { apiClient } from './client';
import type { ApiResponse } from '@storige/types';

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
}

export const authApi = {
  /**
   * 로그인
   */
  login: async (input: LoginInput): Promise<ApiResponse<AuthTokens>> => {
    try {
      const response = await apiClient.post<AuthTokens>('/auth/login', input);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.response?.data?.message || '로그인에 실패했습니다',
        },
      };
    }
  },

  /**
   * 회원가입
   */
  register: async (input: RegisterInput): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.post<User>('/auth/register', input);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.response?.data?.message || '회원가입에 실패했습니다',
        },
      };
    }
  },

  /**
   * 토큰 갱신
   */
  refreshToken: async (refreshToken: string): Promise<ApiResponse<AuthTokens>> => {
    try {
      const response = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.response?.data?.message || '토큰 갱신에 실패했습니다',
        },
      };
    }
  },

  /**
   * 현재 사용자 정보 조회
   */
  getMe: async (): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.post<User>('/auth/me');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.response?.data?.message || '사용자 정보 조회에 실패했습니다',
        },
      };
    }
  },
};
