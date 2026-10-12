import apiClient from '@/lib/api-client'
import type {
  KonteksPenilaianFormData,
  KonteksPenilaianItem,
  KonteksPenilaianFilterParams,
  KonteksOperasionalFormData,
  KonteksOperasionalItem,
  KonteksOperasionalItemFormData,
  KonteksOperasionalItemNode,
} from '@/types/risiko'

export const risikoService = {
  /**
   * Get list of context assessments (Form 2B).
   */
  async getKonteksList(params: KonteksPenilaianFilterParams = {}) {
    const response = await apiClient.get<{
      data: KonteksPenilaianItem[]
      meta: {
        current_page: number
        per_page: number
        total: number
        last_page: number
      }
    }>('/risiko/konteks-strategis', { params })
    return response.data
  },

  /**
   * Get current active OPD context assessment.
   */
  async getCurrentKonteks(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: KonteksPenilaianItem | null
      message?: string
    }>('/risiko/konteks-strategis/current', { params })
    return response.data.data
  },

  /**
   * Get a single context assessment by ID.
   */
  async getKonteksById(id: string) {
    const response = await apiClient.get<{
      data: KonteksPenilaianItem
    }>(`/risiko/konteks-strategis/${id}`)
    return response.data.data
  },

  /**
   * Create or update context assessment (Form 2B).
   */
  async saveKonteks(data: KonteksPenilaianFormData) {
    const response = await apiClient.post<{
      message: string
      data: KonteksPenilaianItem
    }>('/risiko/konteks-strategis', data)
    return response.data
  },

  /**
   * Update existing context assessment by ID.
   */
  async updateKonteks(id: string, data: KonteksPenilaianFormData) {
    const response = await apiClient.put<{
      message: string
      data: KonteksPenilaianItem
    }>(`/risiko/konteks-strategis/${id}`, data)
    return response.data
  },

  /**
   * Delete context assessment.
   */
  async deleteKonteks(id: string) {
    const response = await apiClient.delete<{
      message: string
    }>(`/risiko/konteks-strategis/${id}`)
    return response.data
  },

  /**
   * Download Form 2B Excel (.xlsx).
   */
  async exportExcel(id: string, filename?: string) {
    const response = await apiClient.get(`/risiko/konteks-strategis/${id}/export`, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `Form_2B_Konteks_Risiko_Strategis_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  /**
   * Get list of operational context assessments (Form 2C).
   */
  async getKonteksOperasionalList(params: Record<string, unknown> = {}) {
    const response = await apiClient.get<{
      data: KonteksOperasionalItem[]
      meta: {
        current_page: number
        per_page: number
        total: number
        last_page: number
      }
    }>('/risiko/konteks-operasional', { params })
    return response.data
  },

  /**
   * Get current active OPD operational context assessment (Form 2C).
   */
  async getCurrentKonteksOperasional(params: { opd_id?: string; periode_penilaian_id?: string } = {}) {
    const response = await apiClient.get<{
      data: KonteksOperasionalItem | null
      message?: string
    }>('/risiko/konteks-operasional/current', { params })
    return response.data.data
  },

  /**
   * Get a single operational context assessment by ID.
   */
  async getKonteksOperasionalById(id: string) {
    const response = await apiClient.get<{
      data: KonteksOperasionalItem
    }>(`/risiko/konteks-operasional/${id}`)
    return response.data.data
  },

  /**
   * Create or update operational context assessment (Form 2C header/full).
   */
  async saveKonteksOperasional(data: KonteksOperasionalFormData) {
    const response = await apiClient.post<{
      message: string
      data: KonteksOperasionalItem
    }>('/risiko/konteks-operasional', data)
    return response.data
  },

  /**
   * Update existing operational context assessment header by ID.
   */
  async updateKonteksOperasional(id: string, data: KonteksOperasionalFormData) {
    const response = await apiClient.put<{
      message: string
      data: KonteksOperasionalItem
    }>(`/risiko/konteks-operasional/${id}`, data)
    return response.data
  },

  /**
   * Delete operational context assessment (Form 2C).
   */
  async deleteKonteksOperasional(id: string) {
    const response = await apiClient.delete<{
      message: string
    }>(`/risiko/konteks-operasional/${id}`)
    return response.data
  },

  /**
   * Add a new item (Program, Kegiatan, or Sub-Kegiatan) to Form 2C.
   */
  async saveKonteksOperasionalItem(konteksId: string, data: KonteksOperasionalItemFormData) {
    const response = await apiClient.post<{
      message: string
      data: KonteksOperasionalItemNode
    }>(`/risiko/konteks-operasional/${konteksId}/items`, data)
    return response.data
  },

  /**
   * Update an item in Form 2C.
   */
  async updateKonteksOperasionalItem(konteksId: string, itemId: string, data: KonteksOperasionalItemFormData) {
    const response = await apiClient.put<{
      message: string
      data: KonteksOperasionalItemNode
    }>(`/risiko/konteks-operasional/${konteksId}/items/${itemId}`, data)
    return response.data
  },

  /**
   * Delete an item from Form 2C.
   */
  async deleteKonteksOperasionalItem(konteksId: string, itemId: string) {
    const response = await apiClient.delete<{
      message: string
    }>(`/risiko/konteks-operasional/${konteksId}/items/${itemId}`)
    return response.data
  },

  /**
   * Download Form 2C Excel (.xlsx).
   */
  async exportOperasionalExcel(id: string, filename?: string) {
    const response = await apiClient.get(`/risiko/konteks-operasional/${id}/export`, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `Form_2C_Konteks_Risiko_Operasional_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}
