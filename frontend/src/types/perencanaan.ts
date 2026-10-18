export type PeriodeStatus = 'aktif' | 'tidak_aktif' | 'arsip'

export interface PeriodePenilaianItem {
  id: string
  nama_periode: string
  tahun_mulai: number
  tahun_akhir: number
  tahun_penilaian: number
  daftar_tahun?: number[]
  rentang_tahun: string
  tanggal_mulai: string
  tanggal_akhir: string
  status: PeriodeStatus
  is_aktif: boolean
  sisa_hari: number | null
  keterangan: string | null
  created_by: string | null
  creator?: {
    id: string
    name: string
    nip: string | null
  } | null
  created_at: string
  updated_at: string
}

export interface PeriodeStats {
  total: number
  aktif: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    rentang_tahun: string
    tanggal_akhir: string | null
    sisa_hari: number | null
  } | null
  arsip: number
  tidak_aktif: number
}

export interface PeriodeFormData {
  nama_periode: string
  tahun_mulai: number
  tahun_akhir: number
  tahun_penilaian: number
  tanggal_mulai: string
  tanggal_akhir: string
  status: PeriodeStatus
  keterangan?: string
}

export interface PeriodeFilterParams {
  search?: string
  status?: string
  tahun_penilaian?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
  all?: boolean
}

// ==========================================
// FITUR NO. 14: DATA TUJUAN RENSTRA OPD
// ==========================================

export interface TujuanPenilaianItem {
  id: string
  periode_penilaian_id: string
  opd_id: string
  sumber_data_id?: string | null
  kode_tujuan: string | null
  tujuan: string
  urutan: number
  keterangan: string | null
  sasaran_count: number
  sumber_data?: {
    id: string
    nama: string
    deskripsi?: string | null
  } | null
  opd?: {
    id: string
    nama: string
    kode: string
    kategori: string
    kepala?: string | null
  } | null
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    rentang_tahun: string
    status: PeriodeStatus
  } | null
  creator?: {
    id: string
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface TujuanStats {
  total_tujuan: number
  total_sasaran?: number
  total_indikator?: number
  total_iku?: number
  total_indikator_biasa?: number
  opd_terpetakan: number
  total_opd: number
  persentase_pemetaan: number
  periode_aktif: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    status: string
  } | null
}

export interface TujuanFormData {
  periode_penilaian_id?: string
  opd_id: string
  sumber_data_id?: string | null
  kode_tujuan?: string
  tujuan: string
  urutan?: number
  keterangan?: string
}

export interface TujuanCopyFormData {
  source_periode_id: string
  opd_id?: string
}

export interface TujuanFilterParams {
  search?: string
  opd_id?: string
  periode_penilaian_id?: string
  sumber_data_id?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
  all?: boolean
}

// ==========================================
// FITUR NO. 15: DATA SASARAN RENSTRA OPD
// ==========================================

export interface SasaranPenilaianItem {
  id: string
  periode_penilaian_id: string
  tujuan_penilaian_id: string
  opd_id: string
  kode_sasaran: string | null
  sasaran: string
  urutan: number
  keterangan: string | null
  indikator_count: number
  opd?: {
    id: string
    nama: string
    kode: string
    kategori: string
    kepala?: string | null
  } | null
  tujuan?: {
    id: string
    kode_tujuan: string | null
    tujuan: string
  } | null
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    rentang_tahun: string
    status: PeriodeStatus
  } | null
  creator?: {
    id: string
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface SasaranStats {
  total_sasaran: number
  total_tujuan: number
  tujuan_dengan_sasaran: number
  opd_terpetakan: number
  total_opd: number
  persentase_pemetaan: number
  periode_aktif: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    status: string
  } | null
}

export interface SasaranFormData {
  periode_penilaian_id?: string
  opd_id?: string
  tujuan_penilaian_id: string
  kode_sasaran?: string
  sasaran: string
  urutan?: number
  keterangan?: string
}

export interface SasaranCopyFormData {
  source_periode_id: string
  opd_id?: string
  tujuan_penilaian_id?: string
}

export interface SasaranFilterParams {
  search?: string
  opd_id?: string
  tujuan_penilaian_id?: string
  periode_penilaian_id?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
  all?: boolean
}

// =======================================================
// FITUR NO. 16 & 17: DATA IKU & INDIKATOR RENSTRA OPD
// =======================================================

export type IndikatorJenis = 'IKU' | 'Biasa'

export interface IndikatorPenilaianItem {
  id: string
  periode_penilaian_id: string
  opd_id: string
  tujuan_penilaian_id: string
  sasaran_penilaian_id: string
  kode_indikator: string | null
  indikator: string
  jenis: IndikatorJenis
  satuan?: string | null
  target?: string | null
  urutan: number
  keterangan: string | null
  opd?: {
    id: string
    nama: string
    kode: string
    kategori: string
    kepala?: string | null
  } | null
  tujuan?: {
    id: string
    kode_tujuan: string | null
    tujuan: string
  } | null
  sasaran?: {
    id: string
    kode_sasaran: string | null
    sasaran: string
  } | null
  periode?: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    rentang_tahun: string
    status: PeriodeStatus
  } | null
  creator?: {
    id: string
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface IndikatorStats {
  total_indikator: number
  total_iku: number
  total_indikator_biasa: number
  sasaran_dengan_indikator: number
  total_sasaran: number
  opd_terpetakan: number
  total_opd: number
  persentase_pemetaan: number
  periode_aktif: {
    id: string
    nama_periode: string
    tahun_penilaian: number
    status: string
  } | null
}

export interface IndikatorFormData {
  periode_penilaian_id?: string
  opd_id?: string
  tujuan_penilaian_id?: string
  sasaran_penilaian_id: string
  kode_indikator?: string
  indikator: string
  jenis: IndikatorJenis
  urutan?: number
  keterangan?: string
}

export interface IndikatorCopyFormData {
  source_periode_id: string
  opd_id?: string
  sasaran_penilaian_id?: string
  jenis?: string
}

export interface IndikatorFilterParams {
  search?: string
  opd_id?: string
  tujuan_penilaian_id?: string
  sasaran_penilaian_id?: string
  periode_penilaian_id?: string
  jenis?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
  all?: boolean
}


