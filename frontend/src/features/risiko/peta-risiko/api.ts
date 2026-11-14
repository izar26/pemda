import apiClient from '@/lib/api-client'
import type { PetaRisikoData } from './types'

export interface PetaRisikoParams {
  opd_id: string
  periode_penilaian_id: string
  source?: string
}

export const petaRisikoApi = {
  async get(params: PetaRisikoParams): Promise<PetaRisikoData> {
    const response = await apiClient.get<{ data: PetaRisikoData }>('/risiko/peta-risiko', {
      params: {
        opd_id: params.opd_id,
        periode_penilaian_id: params.periode_penilaian_id,
        source: params.source || undefined,
      },
    })
    return response.data.data
  },
}
