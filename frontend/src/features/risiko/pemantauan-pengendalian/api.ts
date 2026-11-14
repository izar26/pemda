import apiClient from '@/lib/api-client'

export interface PemantauanRow {
  id: string
  source: '3b' | '3c'
  kode_risiko: string
  pernyataan_risiko: string
  kategori_risiko: string
  pemilik_risiko: string | null
  uraian_dampak: string | null
  skala_residual: number
  skala_treated: number | null
  rencana_tindak: string | null
  target_waktu: string | null
  pemantauan_id: string | null
  bentuk_pemantauan: string | null
  penanggung_jawab_pemantauan: string | null
  rencana_waktu_pemantauan: string | null
  realisasi_waktu_pemantauan: string | null
  keterangan: string | null
  complete: boolean
}

export type PemantauanInput = Pick<
  PemantauanRow,
  | 'bentuk_pemantauan'
  | 'penanggung_jawab_pemantauan'
  | 'rencana_waktu_pemantauan'
  | 'realisasi_waktu_pemantauan'
  | 'keterangan'
>

export interface PemantauanResponse {
  data: PemantauanRow[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const pemantauanApi = {
  async list(
    opdId: string,
    periodeId: string,
    page: number,
    search: string,
    source: string,
    status: string
  ): Promise<PemantauanResponse> {
    const response = await apiClient.get<PemantauanResponse>(
      '/risiko/pemantauan-pengendalian',
      {
        params: {
          opd_id: opdId,
          periode_penilaian_id: periodeId,
          page,
          search: search || undefined,
          source: source || undefined,
          status: status || undefined,
        },
      }
    )
    return response.data
  },
  async save(row: PemantauanRow, data: PemantauanInput) {
    const response = await apiClient.put<{ data: PemantauanRow }>(
      `/risiko/pemantauan-pengendalian/${row.source}/${row.id}`,
      data
    )
    return response.data.data
  },
}
