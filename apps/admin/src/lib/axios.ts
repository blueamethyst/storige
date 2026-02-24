import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

/**
 * /storage/... 형태의 상대 URL을 API base URL 기반 절대 URL로 변환
 * 개발: /storage/files/... → http://localhost:4000/api/storage/files/...
 * 운영: /storage/files/... → /storige-api/storage/files/...
 */
export function resolveStorageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('/storage/')) {
    return `${API_BASE_URL}${url}`;
  }
  if (url.startsWith('storage/')) {
    return `${API_BASE_URL}/${url}`;
  }
  return url;
}

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        const basePath = import.meta.env.VITE_ROUTER_BASE || '';
        window.location.href = `${basePath}/login`;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
