export interface OpdItem {
  id: string
  nama: string
  kode: string
  kategori: string
  kepala?: string | null
  urutan: number
  is_active: boolean
  users_count?: number
  created_at?: string
  updated_at?: string
}

export interface OpdStats {
  total: number
  active: number
  inactive: number
  by_kategori: Record<string, number>
  total_pegawai: number
}

export interface OpdQueryParams {
  page?: number
  per_page?: number
  search?: string
  kategori?: string
  status?: 'all' | 'active' | 'inactive'
  is_active?: string | boolean
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  all?: boolean
  /** Auditor only: limit list to OPDs the logged-in auditor is assigned to */
  assigned_only?: boolean
}

export interface OpdPaginatedResponse {
  data: OpdItem[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface OpdPayload {
  nama: string
  kode: string
  kategori: string
  kepala?: string | null
  urutan?: number
  is_active?: boolean
}

export const OPD_CATEGORIES = [
  'Dinas',
  'Badan',
  'Sekretariat',
  'Inspektorat',
  'RSUD',
  'Kecamatan',
  'BUMD',
  'DESA/KELURAHAN',
] as const

export type OpdCategory = (typeof OPD_CATEGORIES)[number]
