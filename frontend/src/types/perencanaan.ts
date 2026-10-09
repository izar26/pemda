export type PeriodeStatus = 'Aktif' | 'Tidak Aktif' | 'Arsip' | 'active' | 'inactive' | 'archived'

export interface PeriodePenilaian {
  id: string
  periode_penilaian: string
  tahun_penilaian: number
  tanggal_mulai: string
  tanggal_berakhir: string
  status: PeriodeStatus
  keterangan?: string | null
  created_at?: string
  updated_at?: string
}

export interface PeriodePayload {
  periode_penilaian: string
  tahun_penilaian: number
  tanggal_mulai: string
  tanggal_berakhir: string
  status: PeriodeStatus
  keterangan?: string | null
}

export interface IndikatorSasaran {
  id: string
  sasaran_id: string
  periode_id?: string
  periode_penilaian_id?: string
  nomor?: string
  indikator: string
  jenis?: string | null
  target?: string | null
  satuan?: string | null
  created_at?: string
  updated_at?: string
}

export interface Sasaran {
  id: string
  tujuan_id: string
  periode_id?: string
  periode_penilaian_id?: string
  nomor?: string
  sasaran: string
  created_at?: string
  updated_at?: string
  indikators?: IndikatorSasaran[]
}

export interface Tujuan {
  id: string
  opd_id: string
  periode_id?: string
  periode_penilaian_id?: string
  nomor?: string
  tujuan: string
  opd_nama?: string
  created_at?: string
  updated_at?: string
  opd?: {
    id: string
    nama?: string
    nama_opd?: string
    kode_opd?: string
  }
  sasarans?: Sasaran[]
}

export interface CascadingTreeItem {
  id: string
  opd_id: string
  opd_nama: string
  periode_id?: string
  periode_penilaian_id?: string
  nomor?: string
  tujuan: string
  sasarans: {
    id: string
    nomor?: string
    sasaran: string
    indikators: {
      id: string
      nomor?: string
      indikator: string
      jenis?: string | null
      target?: string | null
      satuan?: string | null
    }[]
  }[]
}

export interface RenstraSubKegiatan {
  id: string
  kegiatan_id?: string
  renstra_kegiatan_id?: string
  kode: string
  nama: string
  indikator?: string | null
  target?: string | null
  satuan?: string | null
  pagu_indikatif?: number | null
  sipd_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface RenstraKegiatan {
  id: string
  program_id?: string
  renstra_program_id?: string
  kode: string
  nama: string
  indikator?: string | null
  target?: string | null
  satuan?: string | null
  pagu_indikatif?: number | null
  sipd_id?: string | null
  created_at?: string
  updated_at?: string
  sub_kegiatans?: RenstraSubKegiatan[]
}

export interface RenstraProgram {
  id: string
  opd_id: string
  periode_id?: string
  periode_penilaian_id?: string
  kode: string
  nama: string
  indikator?: string | null
  target?: string | null
  satuan?: string | null
  pagu_indikatif?: number | null
  sipd_id?: string | null
  created_at?: string
  updated_at?: string
  opd?: {
    id: string
    nama?: string
    nama_opd?: string
  }
  kegiatans?: RenstraKegiatan[]
}

export interface RenstraFilterParams {
  periode_id?: string
  opd_id?: string
  search?: string
}

export interface RenstraImportResult {
  message: string
  imported: {
    programs: number
    kegiatans: number
    sub_kegiatans: number
  }
  errors: string[]
}

// Sheet 2B: Penetapan Konteks Risiko Strategis OPD (Fitur 26)
export interface KonteksRisikoStrategis {
  id?: string
  periode_penilaian_id: string
  opd_id: string
  sumber_data: string
  tujuan_id: string
  sasaran_ids: string[]
  iku_ids: string[]
  informasi_lain?: string | null
  kepala_opd_nama?: string | null
  kepala_opd_nip?: string | null
  tanggal_penetapan?: string | null
  status?: 'draft' | 'final'
  created_at?: string
  updated_at?: string
  tujuan?: Tujuan
}

export interface KonteksRisikoResponse {
  konteks: KonteksRisikoStrategis | null
  opd: {
    id: string
    nama: string
    kode?: string
    kepala?: string
  } | null
  periode: PeriodePenilaian | null
  available_tujuans: Tujuan[]
  pejabat_kepala: {
    nama: string
    nip: string
    jabatan: string
  }
}

