export interface OpdItem {
  id: number
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
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  all?: boolean
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
  'Kantor',
  'Lainnya',
] as const

export type OpdCategory = (typeof OPD_CATEGORIES)[number]
