export type PeriodeStatus = 'Aktif' | 'Tidak Aktif' | 'Arsip'

export interface PeriodePenilaian {
  id: number
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
  id: number
  sasaran_id: number
  periode_id: number
  indikator: string
  jenis?: string | null
  target?: string | null
  satuan?: string | null
  created_at?: string
  updated_at?: string
}

export interface Sasaran {
  id: number
  tujuan_id: number
  periode_id: number
  sasaran: string
  created_at?: string
  updated_at?: string
  indikators?: IndikatorSasaran[]
}

export interface Tujuan {
  id: number
  opd_id: number
  periode_id: number
  tujuan: string
  created_at?: string
  updated_at?: string
  opd?: {
    id: number
    nama_opd: string
    kode_opd?: string
  }
  sasarans?: Sasaran[]
}

export interface CascadingTreeItem {
  id: number
  opd_id: number
  opd_nama: string
  tujuan: string
  sasarans: {
    id: number
    sasaran: string
    indikators: {
      id: number
      indikator: string
      jenis?: string | null
      target?: string | null
      satuan?: string | null
    }[]
  }[]
}

export interface RenstraSubKegiatan {
  id: number
  kegiatan_id: number
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
  id: number
  program_id: number
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
  id: number
  opd_id: number
  periode_id: number
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
    id: number
    nama_opd: string
  }
  kegiatans?: RenstraKegiatan[]
}

export interface RenstraFilterParams {
  periode_id?: number
  opd_id?: number
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
