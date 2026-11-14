export type RiskSourceType = '3a' | '3b' | '3c'

export interface KejadianRisikoRow {
  id: string
  opd_id: string
  periode_penilaian_id: string
  source_type: RiskSourceType
  risk_item_id: string
  kode_risiko: string | null
  pernyataan_risiko: string | null
  kategori_risiko: string | null
  pemilik_risiko: string | null
  uraian_dampak_risiko: string | null
  tanggal_kejadian: string
  sebab: string
  dampak: string
  keterangan: string | null
  rencana_tindak: string | null
  target_waktu: string | null
  has_rtp: boolean
  realisasi_waktu_rtp: string | null
  keterangan_rtp: string | null
  created_at: string
  updated_at: string
}

export interface RiskOptionItem {
  id: string
  kode_risiko: string
  pernyataan_risiko: string
  kategori_risiko: string
  pemilik_risiko: string
  uraian_dampak: string | null
  source_type: RiskSourceType
  rencana_tindak: string | null
  target_waktu: string | null
  has_rtp: number | boolean
}

export interface RiskOptionsResponse {
  data: {
    pemda: RiskOptionItem[]
    opd: RiskOptionItem[]
    operasional: RiskOptionItem[]
    all: RiskOptionItem[]
  }
}

export interface KejadianRisikoInput {
  opd_id: string
  periode_penilaian_id: string
  source_type: RiskSourceType
  risk_item_id: string
  tanggal_kejadian: string
  sebab: string
  dampak: string
  keterangan?: string | null
  realisasi_waktu_rtp?: string | null
  keterangan_rtp?: string | null
}

export interface ConfirmNihilInput {
  opd_id: string
  periode_penilaian_id: string
  is_nihil: boolean
}

export interface KejadianRisikoListResponse {
  data: KejadianRisikoRow[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  is_nihil: boolean
  nihil_info: {
    confirmed_by: string | null
    confirmed_at: string | null
  } | null
  is_complete: boolean
}
