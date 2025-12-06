import { apiClient } from './client';
import type { ApiResponse } from '@storige/types';

// Product related types
export interface ProductSize {
  sizeNo: number;
  sizeName?: string;
  width: number;
  height: number;
  cutSize: number;
  safeSize?: number;
  nonStandard?: boolean;
  reqWidth?: { min: number; max: number };
  reqHeight?: { min: number; max: number };
}

export interface EditorTemplate {
  id: string;
  name: string;
  sizeNo?: number;
  image?: { image?: { url?: string } };
  design?: { document?: { url?: string } };
  cutLineTemplate?: { image?: { url?: string } };
  tags?: Array<{ id?: string; name?: string }>;
}

export interface Product {
  id: string;
  title: string;
  productId?: string;
  description?: string;
  template?: {
    editorPreset?: {
      settings: {
        dpi?: number;
        guideline?: { cutLine?: boolean; safeLine?: boolean };
        page?: { count?: number; min?: number; max?: number; interval?: number };
        size?: { width?: number; height?: number; cutSize?: number; safeSize?: number };
        unit?: string;
        exportOption?: { colorMode?: 'RGB' | 'CMYK' };
        menu?: unknown[];
      };
      defaultTemplate?: { id: string } | null;
      editorTemplates?: EditorTemplate[] | null;
    } | null;
  };
  wowPressProduct?: {
    prodname?: string;
    dlvygrpname?: string;
    sizeinfo?: Array<{ sizelist: ProductSize[] }>;
    colorinfo?: Array<{ pagelist: unknown[] }>;
  };
  editorTemplates?: EditorTemplate[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const productsApi = {
  /**
   * 상품 목록 조회
   */
  getProducts: async (params?: ProductQueryParams): Promise<ApiResponse<PaginatedProducts>> => {
    try {
      const response = await apiClient.get<ApiResponse<PaginatedProducts>>('/products', { params });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.response?.data?.message || '상품 목록 조회에 실패했습니다',
        },
      };
    }
  },

  /**
   * 상품 상세 조회 (ID 또는 productId로 조회)
   */
  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    try {
      const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.response?.data?.message || '상품 조회에 실패했습니다',
        },
      };
    }
  },
};
