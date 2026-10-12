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
  kode: string
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

