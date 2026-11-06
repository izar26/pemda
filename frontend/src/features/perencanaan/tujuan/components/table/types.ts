import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'

export type DragLevel = 'tujuan' | 'sasaran' | 'indikator'

export interface DragState {
  level: DragLevel
  id: string
  parentId: string
}

export interface TujuanTableProps {
  data: TujuanPenilaianItem[]
  sasarans: SasaranPenilaianItem[]
  indikators: IndikatorPenilaianItem[]
  opds: Array<{ id: string | number; nama: string; kode: string }>
  onRefresh: () => void
  isOpdRole?: boolean
}

export interface OpdGroupItem {
  opdId: string
  opdNama: string
  opdKode: string
  tujuans: TujuanPenilaianItem[]
  totalSasaran: number
  totalIndikator: number
}
