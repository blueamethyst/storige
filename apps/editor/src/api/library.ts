import axios from 'axios'
import type { LibraryFont } from '@storige/types'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const libraryApi = {
  /**
   * 활성화된 폰트 목록 조회
   */
  getFonts: async (): Promise<LibraryFont[]> => {
    const response = await axios.get<LibraryFont[]>(
      `${API_BASE}/api/library/fonts?isActive=true`
    )
    return response.data
  },
}
