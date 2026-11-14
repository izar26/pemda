import apiClient from '@/lib/api-client'

export interface TindakRow {
  id: string
  source: '3b' | '3c'
  kode_risiko: string
  pernyataan_risiko: string
  kategori_risiko: string
  pemilik_risiko: string | null
  akar_penyebab: string | null
  uraian_dampak: string | null
  skala_residual: number
  pengendalian_uraian: string | null
  celah_pengendalian: string | null
  rencana_tindak: string | null
  penanggung_jawab: string | null
  target_waktu: string | null
  treated_kemungkinan: number | null
  treated_dampak: number | null
  skala_treated: number | null
  complete: boolean
}

export type TindakInput = Pick<TindakRow, 'celah_pengendalian' | 'rencana_tindak' | 'penanggung_jawab' | 'target_waktu' | 'treated_kemungkinan' | 'treated_dampak'>
export interface TindakResponse {
  data: TindakRow[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export const tindakApi = {
  async list(opdId: string, periodeId: string, page: number, search: string, source: string, status: string): Promise<TindakResponse> {
    const response = await apiClient.get<TindakResponse>('/risiko/tindak-pengendalian', { params: { opd_id: opdId, periode_penilaian_id: periodeId, page, search: search || undefined, source: source || undefined, status: status || undefined } })
    return response.data
  },
  async save(row: TindakRow, data: TindakInput) {
    const response = await apiClient.put<{ data: TindakRow }>(`/risiko/tindak-pengendalian/${row.source}/${row.id}`, data)
    return response.data.data
  },
}
