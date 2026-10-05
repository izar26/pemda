export type MasterEntityKey =
  | 'pemilik-risiko'
  | 'kategori-risiko'
  | 'penyebab-risiko'
  | 'tingkat-risiko'
  | 'jenis-fraud'
  | 'kriteria-dampak'
  | 'urusan-pemerintahan'
  | 'sumber-data'
  | 'unsur-spip'
  | 'sub-unsur-spip'

export interface MasterSubUnsurSpipItem {
  id: string
  unsur_spip_id: string
  nama: string
  urutan: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface MasterDataBaseItem {
  id: string
  nama: string
  kode?: string
  kategori?: string | null
  kepala?: string | null
  definisi?: string | null
  deskripsi?: string | null
  nomor?: string | null
  urutan: number
  is_active: boolean
  sub_unsurs?: MasterSubUnsurSpipItem[]
  created_at?: string
  updated_at?: string
}

export interface MasterDataPayload {
  nama: string
  kode?: string
  kategori?: string
  kepala?: string
  definisi?: string
  deskripsi?: string
  nomor?: string
  urutan?: number
  is_active?: boolean
  unsur_spip_id?: string
}

export interface MasterDataResponse<T = MasterDataBaseItem> {
  entity: {
    key: string
    label: string
  }
  data: T[]
}

export interface MasterEntityMeta {
  key: MasterEntityKey
  label: string
  category: 'risiko' | 'spip'
  hasCode?: boolean
  descField?: 'definisi' | 'deskripsi'
  descLabel?: string
  isHierarchical?: boolean
}

export const MASTER_ENTITIES: MasterEntityMeta[] = [
  // Kategori 1: Manajemen Risiko (MR)
  {
    key: 'kategori-risiko',
    label: 'Kategori Risiko',
    category: 'risiko',
    hasCode: true,
    descField: 'definisi',
    descLabel: 'Definisi Risiko',
  },
  {
    key: 'tingkat-risiko',
    label: 'Tingkat Risiko',
    category: 'risiko',
    hasCode: true,
    descField: 'deskripsi',
    descLabel: 'Deskripsi',
  },
  {
    key: 'pemilik-risiko',
    label: 'Pemilik Risiko',
    category: 'risiko',
  },
  {
    key: 'penyebab-risiko',
    label: 'Penyebab Risiko (5M+1E)',
    category: 'risiko',
  },
  {
    key: 'kriteria-dampak',
    label: 'Kriteria Dampak',
    category: 'risiko',
    descField: 'deskripsi',
    descLabel: 'Deskripsi Dampak',
  },
  {
    key: 'jenis-fraud',
    label: 'Jenis Fraud (Kecurangan)',
    category: 'risiko',
    descField: 'deskripsi',
    descLabel: 'Deskripsi',
  },
  {
    key: 'sumber-data',
    label: 'Sumber Data Risiko',
    category: 'risiko',
    descField: 'deskripsi',
    descLabel: 'Keterangan',
  },

  // Kategori 2: Tata Kelola & SPIP
  {
    key: 'unsur-spip',
    label: 'Unsur & Sub-Unsur SPIP',
    category: 'spip',
    isHierarchical: true,
  },
  {
    key: 'urusan-pemerintahan',
    label: 'Urusan Pemerintahan',
    category: 'spip',
    hasCode: true,
  },
]
