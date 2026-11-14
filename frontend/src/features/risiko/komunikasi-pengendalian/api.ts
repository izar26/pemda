import apiClient from '@/lib/api-client'

export interface KomunikasiRow {
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
  komunikasi_id: string | null
  media_komunikasi: string | null
  penyedia_informasi: string | null
  penerima_informasi: string | null
  rencana_waktu: string | null
  realisasi_waktu: string | null
  keterangan: string | null
  complete: boolean
}

export type KomunikasiInput = Pick<
  KomunikasiRow,
  | 'media_komunikasi'
  | 'penyedia_informasi'
  | 'penerima_informasi'
  | 'rencana_waktu'
  | 'realisasi_waktu'
  | 'keterangan'
>

export interface KomunikasiResponse {
  data: KomunikasiRow[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export const komunikasiApi = {
  async list(
    opdId: string,
    periodeId: string,
    page: number,
    search: string,
    source: string,
    status: string
  ): Promise<KomunikasiResponse> {
    const response = await apiClient.get<KomunikasiResponse>(
      '/risiko/komunikasi-pengendalian',
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
  async save(row: KomunikasiRow, data: KomunikasiInput) {
    const response = await apiClient.put<{ data: KomunikasiRow }>(
      `/risiko/komunikasi-pengendalian/${row.source}/${row.id}`,
      data
    )
    return response.data.data
  },
}
