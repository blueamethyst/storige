/**
 * Template Sets API client for editor
 */

import { apiClient } from './client'
import type { TemplateSet, Template } from '@storige/types'

export interface TemplateSetWithDetails {
  templateSet: TemplateSet
  templateDetails: Template[]
}

export const templateSetsApi = {
  /**
   * 템플릿셋 상세 조회
   */
  getTemplateSet: async (id: string): Promise<TemplateSet> => {
    const response = await apiClient.get(`/template-sets/${id}`)
    return response.data
  },

  /**
   * 템플릿셋과 템플릿 상세 정보 조회
   */
  getTemplateSetWithTemplates: async (id: string): Promise<TemplateSetWithDetails> => {
    const response = await apiClient.get(`/template-sets/${id}/with-templates`)
    return response.data
  },
}
