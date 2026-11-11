import apiClient from '@/lib/api-client'

export interface AnalisisData {
  kriteria_kemungkinan: string | null
  inheren_kemungkinan: number | null
  kriteria_dampak: string | null
  inheren_dampak: number | null
  pengendalian_ada: boolean | null
  pengendalian_uraian: string | null
  sub_unsur_spip_id: string | null
  sub_unsur?: { id: string; nama: string } | null
  pengendalian_memadai: boolean | null
  residual_kemungkinan: number | null
  residual_dampak: number | null
  residual_kriteria_kemungkinan: string | null
  residual_kriteria_dampak: string | null
  rencana_tindak: string | null
}
export interface AnalisisRow {
  id: string
  source: '3b' | '3c'
  kode_risiko: string
  pernyataan_risiko: string
  kategori_risiko: string
  pemilik_risiko: string
  analysis: AnalisisData | null
  skala_inheren: number | null
  skala_residual: number | null
  evaluasi: string | null
  peringkat: number | null
  complete: boolean
}
export interface AnalisisResponse {
  data: AnalisisRow[]
  meta: { sub_unsur_spip: { id: string; nama: string }[]; current_page: number; last_page: number; total: number; overall_total: number; complete_total: number }
}
export const analisisRisikoApi = {
  async list(opdId: string, periodeId: string, page: number, search: string, source: string, status: string) {
    const response = await apiClient.get<AnalisisResponse>('/risiko/analisis-risiko', { params: { opd_id: opdId, periode_penilaian_id: periodeId, page, search: search || undefined, source: source === 'all' ? undefined : source, status: status || undefined } })
    return response.data
  },
  async save(row: AnalisisRow, data: AnalisisData) {
    await apiClient.put(`/risiko/analisis-risiko/${row.source}/${row.id}`, data)
  },
}
