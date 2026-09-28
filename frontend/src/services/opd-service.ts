import apiClient from '@/lib/api-client'
import type { Opd } from '@/features/users/data/schema'

export interface OpdQueryParams {
  kategori?: string
  search?: string
}

export const opdService = {
  async getOpds(params?: OpdQueryParams): Promise<Opd[]> {
    const response = await apiClient.get<{ data: Opd[] }>('/opds', { params })
    return response.data.data
  },

  async getOpd(id: number): Promise<Opd> {
    const response = await apiClient.get<{ data: Opd }>(`/opds/${id}`)
    return response.data.data
  },
}
