import apiClient from '@/lib/api-client'
import type {
  ConfirmNihilFraInput,
  FraListResponse,
  FraReferenceOptionsResponse,
  FraudRiskAssessmentInput,
  FraudRiskAssessmentRow,
} from './types'

export const fraApi = {
  async list(params: {
    opdId: string
    periodeId: string
    page?: number
    perPage?: number
    search?: string
    prosesBisnis?: string
    jenisFraudId?: string
  }): Promise<FraListResponse> {
    const response = await apiClient.get<FraListResponse>('/risiko/fra', {
      params: {
        opd_id: params.opdId,
        periode_penilaian_id: params.periodeId,
        page: params.page || 1,
        per_page: params.perPage || 20,
        search: params.search || undefined,
        proses_bisnis: params.prosesBisnis || undefined,
        jenis_fraud_id: params.jenisFraudId || undefined,
      },
    })
    return response.data
  },

  async getReferenceOptions(): Promise<FraReferenceOptionsResponse['data']> {
    const response = await apiClient.get<FraReferenceOptionsResponse>(
      '/risiko/fra/reference-options'
    )
    return response.data.data
  },

  async store(data: FraudRiskAssessmentInput): Promise<FraudRiskAssessmentRow> {
    const response = await apiClient.post<{ data: FraudRiskAssessmentRow }>(
      '/risiko/fra',
      data
    )
    return response.data.data
  },

  async update(
    id: string,
    data: Partial<FraudRiskAssessmentInput>
  ): Promise<FraudRiskAssessmentRow> {
    const response = await apiClient.put<{ data: FraudRiskAssessmentRow }>(
      `/risiko/fra/${id}`,
      data
    )
    return response.data.data
  },

  async destroy(id: string): Promise<void> {
    await apiClient.delete(`/risiko/fra/${id}`)
  },

  async confirmNihil(
    data: ConfirmNihilFraInput
  ): Promise<{ is_nihil: boolean; nihil_info: FraListResponse['nihil_info']; is_complete: boolean }> {
    const response = await apiClient.post<{
      data: { is_nihil: boolean; nihil_info: FraListResponse['nihil_info']; is_complete: boolean }
    }>('/risiko/fra/confirm-nihil', data)
    return response.data.data
  },
}
