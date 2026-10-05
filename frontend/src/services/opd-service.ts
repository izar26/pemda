import apiClient from '@/lib/api-client'
import type { Opd } from '@/features/users/data/schema'
import type {
  OpdItem,
  OpdPaginatedResponse,
  OpdPayload,
  OpdQueryParams,
  OpdStats,
} from '@/types/opd'

export type { OpdQueryParams }

export const opdService = {
  /**
   * Fast list of active OPDs for dropdowns and select inputs.
   * Backward compatible with existing users features.
   */
  async getOpds(params?: OpdQueryParams): Promise<Opd[]> {
    try {
      const response = await apiClient.get<{ data: Opd[] }>('/opds', {
        params: { all: true, ...params },
      })
      return Array.isArray(response.data?.data) ? response.data.data : []
    } catch {
      return []
    }
  },

  /**
   * Paginated OPD list for dedicated OPD management table.
   */
  async getPaginatedOpds(params: OpdQueryParams): Promise<OpdPaginatedResponse> {
    const response = await apiClient.get<OpdPaginatedResponse>('/opds', {
      params,
    })
    return response.data
  },

  /**
   * Fetch statistical summary of OPDs and ASN distribution.
   */
  async getStats(): Promise<OpdStats> {
    const response = await apiClient.get<OpdStats>('/opds/stats')
    return response.data
  },

  /**
   * Get single OPD detail by ID.
   */
  async getOpd(id: string): Promise<OpdItem> {
    const response = await apiClient.get<{ data: OpdItem }>(`/opds/${id}`)
    return response.data.data
  },

  /**
   * Create a new OPD.
   */
  async createOpd(payload: OpdPayload): Promise<{ message: string; data: OpdItem }> {
    const response = await apiClient.post<{ message: string; data: OpdItem }>(
      '/opds',
      payload
    )
    return response.data
  },

  /**
   * Update an existing OPD.
   */
  async updateOpd(
    id: string,
    payload: OpdPayload
  ): Promise<{ message: string; data: OpdItem }> {
    const response = await apiClient.put<{ message: string; data: OpdItem }>(
      `/opds/${id}`,
      payload
    )
    return response.data
  },

  /**
   * Toggle active status of an OPD.
   */
  async toggleActive(id: string): Promise<{ message: string; data: OpdItem }> {
    const response = await apiClient.patch<{ message: string; data: OpdItem }>(
      `/opds/${id}/toggle`
    )
    return response.data
  },

  /**
   * Delete an OPD (blocked if employees are assigned).
   */
  async deleteOpd(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/opds/${id}`)
    return response.data
  },
}
