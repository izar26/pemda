export interface FraudRiskAssessmentRow {
  id: string
  opd_id: string
  periode_penilaian_id: string
  nomor_urut: number | null
  proses_bisnis: string
  identifikasi_risiko_kecurangan: string
  skenario_kecurangan: string
  jenis_fraud_id: string | null
  jenis_risiko_kecurangan: string
  pemilik_risiko: string
  penyebab: string
  existing_control: string
  kemungkinan_kriteria: string
  kemungkinan_skor: number
  dampak_kriteria: string
  dampak_skor: number
  skala_risiko: number
  mitigasi: string
  created_at?: string
  updated_at?: string
}

export interface FraudRiskAssessmentInput {
  opd_id: string
  periode_penilaian_id: string
  nomor_urut?: number | null
  proses_bisnis: string
  identifikasi_risiko_kecurangan: string
  skenario_kecurangan: string
  jenis_fraud_id?: string | null
  jenis_risiko_kecurangan?: string
  pemilik_risiko: string
  penyebab: string
  existing_control: string
  kemungkinan_kriteria: string
  kemungkinan_skor: number
  dampak_kriteria: string
  dampak_skor: number
  mitigasi: string
}

export interface FraReferenceOptions {
  jenis_fraud: Array<{ id: string; nama: string; urutan: number }>
  pemilik_risiko: Array<{ id: string; nama: string; urutan: number }>
  penyebab: string[]
  kriteria_kemungkinan: string[]
  kriteria_dampak: string[]
  preset_proses_bisnis: string[]
}

export interface FraReferenceOptionsResponse {
  data: FraReferenceOptions
}

export interface ConfirmNihilFraInput {
  opd_id: string
  periode_penilaian_id: string
  is_nihil: boolean
  catatan?: string | null
}

export interface FraListResponse {
  data: FraudRiskAssessmentRow[]
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
    catatan?: string | null
  } | null
  is_complete: boolean
}
