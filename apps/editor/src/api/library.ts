import type { LibraryFont } from '@storige/types'
import { apiClient } from './client'

export const libraryApi = {
  /**
   * 활성화된 폰트 목록 조회
   */
  getFonts: async (): Promise<LibraryFont[]> => {
    const response = await apiClient.get<LibraryFont[]>(
      '/library/fonts?isActive=true'
    )
    return response.data
  },
}
