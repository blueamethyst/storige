import { axiosInstance } from '../lib/axios';
import { LibraryFont, LibraryBackground, LibraryClipart } from '@storige/types';

// Fonts
export interface CreateFontDto {
  name: string;
  fileUrl: string;
  fileFormat: string;
  isActive?: boolean;
}

export const libraryApi = {
  // Fonts
  getFonts: async (isActive?: boolean): Promise<LibraryFont[]> => {
    const params = isActive !== undefined ? `?isActive=${isActive}` : '';
    const response = await axiosInstance.get<LibraryFont[]>(`/library/fonts${params}`);
    return response.data;
  },

  createFont: async (data: CreateFontDto): Promise<LibraryFont> => {
    const response = await axiosInstance.post<LibraryFont>('/library/fonts', data);
    return response.data;
  },

  updateFont: async (id: string, data: Partial<CreateFontDto>): Promise<LibraryFont> => {
    const response = await axiosInstance.put<LibraryFont>(`/library/fonts/${id}`, data);
    return response.data;
  },

  deleteFont: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/library/fonts/${id}`);
  },

  // Backgrounds
  getBackgrounds: async (category?: string, isActive?: boolean): Promise<LibraryBackground[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (isActive !== undefined) params.append('isActive', String(isActive));
    const response = await axiosInstance.get<LibraryBackground[]>(
      `/library/backgrounds?${params.toString()}`
    );
    return response.data;
  },

  createBackground: async (data: Partial<LibraryBackground>): Promise<LibraryBackground> => {
    const response = await axiosInstance.post<LibraryBackground>('/library/backgrounds', data);
    return response.data;
  },

  updateBackground: async (
    id: string,
    data: Partial<LibraryBackground>
  ): Promise<LibraryBackground> => {
    const response = await axiosInstance.put<LibraryBackground>(
      `/library/backgrounds/${id}`,
      data
    );
    return response.data;
  },

  deleteBackground: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/library/backgrounds/${id}`);
  },

  // Cliparts
  getCliparts: async (category?: string, isActive?: boolean): Promise<LibraryClipart[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (isActive !== undefined) params.append('isActive', String(isActive));
    const response = await axiosInstance.get<LibraryClipart[]>(
      `/library/cliparts?${params.toString()}`
    );
    return response.data;
  },

  searchClipartsByTags: async (tags: string[]): Promise<LibraryClipart[]> => {
    const response = await axiosInstance.get<LibraryClipart[]>(
      `/library/cliparts/search/tags?tags=${tags.join(',')}`
    );
    return response.data;
  },

  createClipart: async (data: Partial<LibraryClipart>): Promise<LibraryClipart> => {
    const response = await axiosInstance.post<LibraryClipart>('/library/cliparts', data);
    return response.data;
  },

  updateClipart: async (id: string, data: Partial<LibraryClipart>): Promise<LibraryClipart> => {
    const response = await axiosInstance.put<LibraryClipart>(`/library/cliparts/${id}`, data);
    return response.data;
  },

  deleteClipart: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/library/cliparts/${id}`);
  },
};
