import apiClient from '@/lib/api-client'
import type {
  ConfirmNihilInput,
  KejadianRisikoInput,
  KejadianRisikoListResponse,
  KejadianRisikoRow,
  RiskOptionsResponse,
} from './types'

export const kejadianRisikoApi = {
  async list(params: {
    opdId: string
    periodeId: string
    page?: number
    perPage?: number
    search?: string
    source?: string
  }): Promise<KejadianRisikoListResponse> {
    const response = await apiClient.get<KejadianRisikoListResponse>(
      '/risiko/kejadian-risiko',
      {
        params: {
          opd_id: params.opdId,
          periode_penilaian_id: params.periodeId,
          page: params.page || 1,
          per_page: params.perPage || 20,
          search: params.search || undefined,
          source: params.source || undefined,
        },
      }
    )
    return response.data
  },

  async getRiskOptions(
    opdId: string,
    periodeId: string
  ): Promise<RiskOptionsResponse['data']> {
    const response = await apiClient.get<RiskOptionsResponse>(
      '/risiko/kejadian-risiko/risk-options',
      {
        params: {
          opd_id: opdId,
          periode_penilaian_id: periodeId,
        },
      }
    )
    return response.data.data
  },

  async store(data: KejadianRisikoInput): Promise<KejadianRisikoRow> {
    const response = await apiClient.post<{
      message: string
      data: KejadianRisikoRow
    }>('/risiko/kejadian-risiko', data)
    return response.data.data
  },

  async update(
    id: string,
    data: Partial<KejadianRisikoInput>
  ): Promise<KejadianRisikoRow> {
    const response = await apiClient.put<{
      message: string
      data: KejadianRisikoRow
    }>(`/risiko/kejadian-risiko/${id}`, data)
    return response.data.data
  },

  async destroy(id: string): Promise<void> {
    await apiClient.delete(`/risiko/kejadian-risiko/${id}`)
  },

  async confirmNihil(data: ConfirmNihilInput): Promise<{
    is_nihil: boolean
    confirmed_at?: string | null
    confirmed_by?: string | null
  }> {
    const response = await apiClient.post<{
      message: string
      data: {
        is_nihil: boolean
        confirmed_at?: string | null
        confirmed_by?: string | null
      }
    }>('/risiko/kejadian-risiko/confirm-nihil', data)
    return response.data.data
  },
}
