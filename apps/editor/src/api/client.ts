import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// 재시도 가능한 상태 코드
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// 재시도 설정
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1초
  backoffMultiplier: 2, // 지수 백오프
};

// 에러 타입 정의
export interface ApiError {
  code: 'NETWORK_ERROR' | 'TIMEOUT' | 'AUTH_EXPIRED' | 'SERVER_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN';
  message: string;
  status?: number;
  originalError?: Error;
}

// API 에러 변환 함수
export function parseApiError(error: AxiosError): ApiError {
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      message: '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
      originalError: error,
    };
  }

  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: '네트워크 연결을 확인해주세요.',
      originalError: error,
    };
  }

  const status = error.response.status;
  const data = error.response.data as any;

  if (status === 401) {
    return {
      code: 'AUTH_EXPIRED',
      message: data?.message || '인증이 만료되었습니다. 다시 로그인해주세요.',
      status,
      originalError: error,
    };
  }

  if (status === 400 || status === 422) {
    return {
      code: 'VALIDATION_ERROR',
      message: data?.message || '입력값을 확인해주세요.',
      status,
      originalError: error,
    };
  }

  if (status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: data?.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      status,
      originalError: error,
    };
  }

  return {
    code: 'UNKNOWN',
    message: data?.message || '알 수 없는 오류가 발생했습니다.',
    status,
    originalError: error,
  };
}

// 이벤트 리스너 타입
type AuthExpiredListener = () => void;

class ApiClient {
  private client: AxiosInstance;
  private authExpiredListeners: AuthExpiredListener[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 인증 만료 이벤트 리스너 등록
   */
  onAuthExpired(listener: AuthExpiredListener) {
    this.authExpiredListeners.push(listener);
    return () => {
      this.authExpiredListeners = this.authExpiredListeners.filter(l => l !== listener);
    };
  }

  private emitAuthExpired() {
    this.authExpiredListeners.forEach(listener => listener());
  }

  /**
   * Set the base URL for API requests (used for embedded editor)
   */
  setBaseUrl(baseUrl: string) {
    this.client.defaults.baseURL = baseUrl;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.client.defaults.baseURL || API_BASE_URL;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // 재시도 카운터 초기화
        (config as any).__retryCount = (config as any).__retryCount || 0;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { __retryCount?: number };

        // 인증 만료 처리
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          this.emitAuthExpired();
          return Promise.reject(error);
        }

        // 재시도 로직
        const retryCount = config?.__retryCount || 0;
        const shouldRetry =
          config &&
          retryCount < RETRY_CONFIG.maxRetries &&
          error.response?.status &&
          RETRYABLE_STATUS_CODES.includes(error.response.status);

        if (shouldRetry) {
          config.__retryCount = retryCount + 1;
          const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount);

          console.log(`[ApiClient] Retrying request (${retryCount + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`);

          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client.request(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 재시도와 함께 요청 실행
   */
  async requestWithRetry<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw parseApiError(error);
      }
      throw error;
    }
  }

  get<T = any>(url: string, config?: any) {
    return this.client.get<T>(url, config);
  }

  post<T = any>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: any) {
    return this.client.put<T>(url, data, config);
  }

  patch<T = any>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T = any>(url: string, config?: any) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
