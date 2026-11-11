import type { PeriodeStatus } from './perencanaan'

export interface KonteksPenilaianItem {
  id: string
  periode_penilaian_id: string
  opd_id: string
  sumber_data_id: string | null
  tujuan_penilaian_id: string
  nama_pemda: string
  informasi_lain: string | null
  nama_kepala: string | null
  nip_kepala: string | null
  jabatan_kepala: string | null
  tanggal_penetapan: string | null
  status: 'draft' | 'final'
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    rentang_tahun: string
    status: PeriodeStatus
  } | null
  opd?: {
    id: string
    nama: string
    kode: string
    kategori: string
    kepala?: string | null
  } | null
  sumber_data?: {
    id: string
    nama: string
  } | null
  tujuan?: {
    id: string
    kode_tujuan: string | null
    tujuan: string
    urutan: number
  } | null
  sasarans?: Array<{
    id: string
    kode_sasaran: string | null
    sasaran: string
    urutan: number
  }>
  indikators?: Array<{
    id: string
    sasaran_penilaian_id: string
    kode_indikator: string | null
    indikator: string
    jenis: 'IKU' | 'Biasa'
    urutan: number
  }>
  creator?: {
    id: string
    name: string
  } | null
  updater?: {
    id: string
    name: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface KonteksOpdMeta {
  kepala_opd: {
    nama: string | null
    nip: string | null
    jabatan: string | null
  }
  operasional_summary: {
    id: string | null
    status: 'draft' | 'final' | null
    total_items: number
    programs_count: number
    kegiatans_count: number
    sub_kegiatans_count: number
  }
}

export interface KonteksPenilaianFormData {
  periode_penilaian_id?: string
  opd_id: string
  sumber_data_id?: string
  tujuan_penilaian_id: string
  sasaran_ids: string[]
  indikator_ids: string[]
  informasi_lain?: string
  nama_pemda?: string
  nama_kepala?: string
  nip_kepala?: string
  jabatan_kepala?: string
  tanggal_penetapan?: string
  status?: 'draft' | 'final'
  reset_operasional_items?: boolean
}

export interface KonteksPenilaianFilterParams {
  search?: string
  opd_id?: string
  periode_penilaian_id?: string
  status?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

// ==========================================
// FORM 2C: PENETAPAN KONTEKS RISIKO OPERASIONAL OPD
// ==========================================

export type KonteksOperasionalItemJenis = 'program' | 'kegiatan' | 'sub_kegiatan'

export interface KonteksOperasionalIndikator {
  id?: string
  item_id?: string
  indikator: string
  target: string
  satuan?: string | null
  urutan?: number
}

export interface KonteksOperasionalItemNode {
  id: string
  konteks_operasional_id: string
  parent_id: string | null
  jenis: KonteksOperasionalItemJenis
  kode: string
  nama: string
  urutan: number
  indikators?: KonteksOperasionalIndikator[]
  children?: KonteksOperasionalItemNode[]
  created_at?: string
  updated_at?: string
}

export interface KonteksOperasionalItem {
  id: string
  periode_penilaian_id: string
  opd_id: string
  sumber_data_id: string | null
  nama_pemda: string
  informasi_lain: string | null
  nama_kepala: string | null
  nip_kepala: string | null
  jabatan_kepala: string | null
  tanggal_penetapan: string | null
  status: 'draft' | 'final'
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    rentang_tahun: string
    status: PeriodeStatus
  } | null
  opd?: {
    id: string
    nama: string
    kode: string
    kategori: string
    kepala?: string | null
  } | null
  sumber_data?: {
    id: string
    nama: string
  } | null
  tujuan_strategis?: {
    id: string
    kode_tujuan: string | null
    tujuan: string
  } | null
  items?: KonteksOperasionalItemNode[]
  programs?: KonteksOperasionalItemNode[]
  creator?: {
    id: string
    name: string
  } | null
  updater?: {
    id: string
    name: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface KonteksOperasionalFormData {
  periode_penilaian_id?: string
  opd_id: string
  sumber_data_id?: string
  informasi_lain?: string
  nama_pemda?: string
  nama_kepala?: string
  nip_kepala?: string
  jabatan_kepala?: string
  tanggal_penetapan?: string
  status?: 'draft' | 'final'
  items?: Array<{
    jenis: KonteksOperasionalItemJenis
    kode: string
    nama: string
    parent_kode?: string | null
    urutan?: number
    indikators?: Array<{
      indikator: string
      target: string
      satuan?: string
    }>
  }>
}

export interface KonteksOperasionalItemFormData {
  parent_id?: string | null
  jenis: KonteksOperasionalItemJenis
  kode?: string
  nama: string
  urutan?: number
  indikators?: Array<{
    id?: string
    indikator: string
    target: string
    satuan?: string | null
    urutan?: number
  }>
}

// ==========================================
// FORM 3A & RCA (IDENTIFIKASI RISIKO PEMDA & 5-WHYS)
// ==========================================

export type KategoriRisikoPemda =
  | 'Risiko Fraud'
  | 'Risiko Belanja'
  | 'Risiko Pembiayaan'
  | 'Risiko Strategis'
  | 'Risiko Kepatuhan'
  | 'Risiko Operasional'
  | 'Risiko Reputasi'
  | 'Risiko Pendapatan'

export type KategoriRisikoOpd = KategoriRisikoPemda

export type SifatRisiko = 'C' | 'UC'

export type JenisPenyebabRca =
  | 'Man'
  | 'Money'
  | 'Method'
  | 'Machine'
  | 'Material'
  | 'Eksternal'

export interface RootCauseAnalysis {
  id: string
  source_type?: '3a' | '3b' | '3c'
  identifikasi_risiko_pemda_item_id?: string | null
  identifikasi_risiko_opd_item_id?: string | null
  identifikasi_risiko_opd_operasional_item_id?: string | null
  why_1?: string | null
  why_2?: string | null
  why_3?: string | null
  why_4?: string | null
  why_5?: string | null
  akar_penyebab?: string | null
  jenis_penyebab?: JenisPenyebabRca | null
  kegiatan_pengendalian?: string | null
  item?: {
    id: string
    nomor_urut: number
    kode_risiko: string
    pernyataan_risiko: string
    kategori_risiko: KategoriRisikoPemda
    pemilik_risiko: string
    sifat_risiko: SifatRisiko
    uraian_dampak?: string | null
    pihak_terkena?: string | null
    sasaran?: string
    indikator?: string
    probis?: string | null
    program?: string | null
    kegiatan?: string | null
    sub_kegiatan?: string | null
  }
  created_at?: string
  updated_at?: string
}

export interface IdentifikasiRisikoPemdaItem {
  id: string
  identifikasi_risiko_pemda_id: string
  sasaran_penilaian_id?: string | null
  sasaran_kustom?: string | null
  resolved_sasaran: string
  indikator_penilaian_id?: string | null
  indikator_kustom?: string | null
  resolved_indikator: string
  kategori_risiko: KategoriRisikoPemda
  nomor_urut: number
  pernyataan_risiko: string
  kode_risiko: string
  pemilik_risiko: string
  sifat_risiko: SifatRisiko
  uraian_dampak?: string | null
  pihak_terkena?: string | null
  urutan: number
  uraian_sebab?: string | null
  sumber_risiko?: JenisPenyebabRca | null
  kegiatan_pengendalian?: string | null
  has_rca: boolean
  rca?: RootCauseAnalysis | null
  sasaran?: {
    id: string
    kode_sasaran: string | null
    sasaran: string
  } | null
  indikator?: {
    id: string
    kode_indikator: string | null
    indikator: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface IdentifikasiRisikoPemda {
  id: string
  periode_penilaian_id: string
  opd_id: string
  master_urusan_pemerintahan_id: string | null
  nama_pemda: string
  status: string
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    tahun_mulai: number
    tahun_selesai: number
  } | null
  opd?: {
    id: string
    nama: string
    kode: string
    kepala?: string | null
  } | null
  urusan_pemerintahan?: {
    id: string
    kode: string
    nama: string
  } | null
  items: IdentifikasiRisikoPemdaItem[]
  items_count: number
  created_at?: string
  updated_at?: string
}

export interface IdentifikasiRisikoPemdaMeta {
  form_2b_exists: boolean
  tujuan_strategis?: string | null
  sasarans_from_2b: Array<{
    id: string
    kode_sasaran: string | null
    sasaran: string
    indikators: Array<{
      id: string
      kode_indikator: string | null
      indikator: string
    }>
  }>
  urusan_pemerintahans: Array<{
    id: string
    kode: string
    nama: string
  }>
  pemilik_risiko_options?: Array<{
    id: string
    nama: string
  }>
  kategori_options: KategoriRisikoPemda[]
}

export interface IdentifikasiRisikoOpdItem {
  id: string
  identifikasi_risiko_opd_id: string
  sasaran_penilaian_id?: string | null
  sasaran_kustom?: string | null
  resolved_sasaran: string
  indikator_penilaian_id?: string | null
  indikator_kustom?: string | null
  resolved_indikator: string
  kategori_risiko: KategoriRisikoPemda
  nomor_urut: number
  pernyataan_risiko: string
  kode_risiko: string
  pemilik_risiko: string
  sifat_risiko: SifatRisiko
  uraian_dampak?: string | null
  pihak_terkena?: string | null
  urutan: number
  uraian_sebab?: string | null
  sumber_risiko?: JenisPenyebabRca | null
  kegiatan_pengendalian?: string | null
  has_rca: boolean
  rca?: RootCauseAnalysis | null
  sasaran?: {
    id: string
    kode_sasaran: string | null
    sasaran: string
  } | null
  indikator?: {
    id: string
    kode_indikator: string | null
    indikator: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface IdentifikasiRisikoOpd {
  id: string
  periode_penilaian_id: string
  opd_id: string
  master_urusan_pemerintahan_id: string | null
  nama_pemda: string
  singkatan_opd?: string | null
  nama_kepala_opd?: string | null
  status: string
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    tahun_mulai: number
    tahun_selesai: number
  } | null
  opd?: {
    id: string
    nama: string
    kode: string
    kepala?: string | null
    singkatan?: string | null
  } | null
  urusan_pemerintahan?: {
    id: string
    kode: string
    nama: string
  } | null
  items: IdentifikasiRisikoOpdItem[]
  items_count: number
  created_at?: string
  updated_at?: string
}

export interface IdentifikasiRisikoOpdMeta {
  form_2b_exists: boolean
  tujuan_strategis?: string | null
  sasarans_from_2b: Array<{
    id: string
    kode_sasaran: string | null
    sasaran: string
    indikators: Array<{
      id: string
      kode_indikator: string | null
      indikator: string
    }>
  }>
  urusan_pemerintahans: Array<{
    id: string
    kode: string
    nama: string
  }>
  pemilik_risiko_options?: Array<{
    id: string
    nama: string
  }>
  kategori_options: KategoriRisikoPemda[]
}

// ==========================================
// FORM 3C: IDENTIFIKASI RISIKO OPERASIONAL OPD
// ==========================================

export interface IdentifikasiRisikoOpdOperasionalItem {
  id: string
  identifikasi_risiko_opd_operasional_id: string
  operasional_sub_kegiatan_id?: string | null
  sub_kegiatan_kustom?: string | null
  resolved_program: string
  resolved_kegiatan: string
  resolved_sub_kegiatan: string
  indikator_keluaran_kustom?: string | null
  resolved_indikator: string
  probis: string
  kategori_risiko: KategoriRisikoPemda
  nomor_urut: number
  pernyataan_risiko: string
  kode_risiko: string
  pemilik_risiko: string
  sifat_risiko: SifatRisiko
  uraian_dampak?: string | null
  pihak_terkena?: string | null
  urutan: number
  uraian_sebab?: string | null
  sumber_risiko?: JenisPenyebabRca | null
  kegiatan_pengendalian?: string | null
  has_rca: boolean
  rca?: RootCauseAnalysis | null
  sub_kegiatan?: {
    id: string
    kode: string
    nama: string
    jenis: string
  } | null
  created_at?: string
  updated_at?: string
}

export interface IdentifikasiRisikoOpdOperasional {
  id: string
  periode_penilaian_id: string
  opd_id: string
  master_urusan_pemerintahan_id: string | null
  nama_pemda: string
  singkatan_opd?: string | null
  nama_kepala_opd?: string | null
  status: string
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    tahun_mulai: number
    tahun_selesai: number
  } | null
  opd?: {
    id: string
    nama: string
    kode: string
    kepala?: string | null
    singkatan?: string | null
  } | null
  urusan_pemerintahan?: {
    id: string
    kode: string
    nama: string
  } | null
  items: IdentifikasiRisikoOpdOperasionalItem[]
  items_count: number
  created_at?: string
  updated_at?: string
}

export interface IdentifikasiRisikoOpdOperasionalMeta {
  form_2c_exists: boolean
  sub_kegiatans_from_2c: Array<{
    id: string
    kode: string
    nama: string
    kegiatan_nama: string | null
    program_nama: string | null
    indikator_keluaran: string | null
  }>
  probis_options: string[]
  urusan_pemerintahans: Array<{
    id: string
    kode: string
    nama: string
  }>
  pemilik_risiko_options?: Array<{
    id: string
    nama: string
  }>
  kategori_options: KategoriRisikoPemda[]
}



