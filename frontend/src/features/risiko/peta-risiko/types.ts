export type RiskSource = '3b' | '3c'

export interface PetaRisikoItem {
  id: string
  source: RiskSource
  kode_risiko: string
  pernyataan_risiko: string
  kategori_risiko: string
  pemilik_risiko: string
  kemungkinan: number
  dampak: number
  skala: number
  zona: string
  rencana_tindak?: string
  penanggung_jawab?: string
  target_waktu?: string
}

export interface PetaRisikoCell {
  kemungkinan: number
  kemungkinan_label: string
  dampak: number
  dampak_label: string
  score: number
  zona: string
  count: number
  items: PetaRisikoItem[]
}

export interface PetaRisikoMatrix {
  cells: PetaRisikoCell[]
  total_risks: number
}

export interface PetaRisikoRekapitulasi {
  zona: string
  label: string
  short_label: string
  skor_range: string
  color: string
  bg_class: string
  inherent_count: number
  residual_count: number
  treated_count: number
}

export interface PetaRisikoData {
  opd: {
    id: string
    nama: string
    kode?: string
  }
  periode: {
    id: string
    nama_periode?: string
    tahun_penilaian?: number
  }
  matrices: {
    inherent: PetaRisikoMatrix
    residual: PetaRisikoMatrix
    treated: PetaRisikoMatrix
  }
  rekapitulasi: PetaRisikoRekapitulasi[]
  total_all: {
    inherent: number
    residual: number
    treated: number
  }
}
