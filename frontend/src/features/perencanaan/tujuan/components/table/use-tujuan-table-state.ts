import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/use-permissions'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { useTujuan } from '../tujuan-provider'
import type { DragState, OpdGroupItem } from './types'

interface UseTujuanTableStateParams {
  data: TujuanPenilaianItem[]
  sasarans: SasaranPenilaianItem[]
  indikators: IndikatorPenilaianItem[]
  opds: Array<{ id: string | number; nama: string; kode: string }>
  onRefresh: () => void
  isOpdRole?: boolean
}

export function useTujuanTableState({
  data,
  sasarans,
  indikators,
  opds,
  onRefresh,
  isOpdRole = false,
}: UseTujuanTableStateParams) {
  const { setTableFilters } = useTujuan()
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission('tujuan.create')
  const canEdit = hasPermission('tujuan.edit')
  const canDelete = hasPermission('tujuan.delete')

  // Local optimistic state for instant drag-and-drop feedback
  const [localTujuans, setLocalTujuans] = useState<TujuanPenilaianItem[]>(data)
  const [localSasarans, setLocalSasarans] = useState<SasaranPenilaianItem[]>(sasarans)
  const [localIndikators, setLocalIndikators] = useState<IndikatorPenilaianItem[]>(indikators)

  const [prevData, setPrevData] = useState(data)
  const [prevSasarans, setPrevSasarans] = useState(sasarans)
  const [prevIndikators, setPrevIndikators] = useState(indikators)

  if (data !== prevData) {
    setPrevData(data)
    setLocalTujuans(data)
  }

  if (sasarans !== prevSasarans) {
    setPrevSasarans(sasarans)
    setLocalSasarans(sasarans)
  }

  if (indikators !== prevIndikators) {
    setPrevIndikators(indikators)
    setLocalIndikators(indikators)
  }

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOpdId, setSelectedOpdId] = useState<string>('all')

  // Expand / Collapse state (expanded by default)
  const [collapsedTujuan, setCollapsedTujuan] = useState<Record<string, boolean>>({})
  const [collapsedSasaran, setCollapsedSasaran] = useState<Record<string, boolean>>({})

  // OPD Wrapper Expand / Collapse state (collapsed by default when showing all OPDs)
  const [expandedOpds, setExpandedOpds] = useState<Record<string, boolean>>({})

  // Drag & Drop state
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    const nextSearch = searchQuery.trim() || undefined
    const nextOpdId = selectedOpdId !== 'all' ? selectedOpdId : undefined
    setTableFilters((prev) => {
      if (prev.search === nextSearch && prev.opd_id === nextOpdId) {
        return prev
      }
      return {
        search: nextSearch,
        opd_id: nextOpdId,
      }
    })
  }, [searchQuery, selectedOpdId, setTableFilters])

  const opdOptions = useMemo(
    () => [
      { value: 'all', label: 'Semua Perangkat Daerah (OPD)' },
      ...opds.map((opd) => ({
        value: String(opd.id),
        label: `${opd.nama} (${opd.kode})`,
      })),
    ],
    [opds]
  )

  // Group sasarans by tujuan_penilaian_id and indikators by sasaran_penilaian_id
  const sasaransByTujuan = useMemo(() => {
    const map: Record<string, SasaranPenilaianItem[]> = {}
    for (const s of localSasarans) {
      if (!map[s.tujuan_penilaian_id]) {
        map[s.tujuan_penilaian_id] = []
      }
      map[s.tujuan_penilaian_id].push(s)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.urutan - b.urutan)
    }
    return map
  }, [localSasarans])

  const indikatorsBySasaran = useMemo(() => {
    const map: Record<string, IndikatorPenilaianItem[]> = {}
    for (const ind of localIndikators) {
      if (!map[ind.sasaran_penilaian_id]) {
        map[ind.sasaran_penilaian_id] = []
      }
      map[ind.sasaran_penilaian_id].push(ind)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.urutan - b.urutan)
    }
    return map
  }, [localIndikators])

  // Filtered Tujuan tree
  const filteredTujuans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return localTujuans
      .filter((t) => {
        if (selectedOpdId !== 'all' && t.opd_id !== selectedOpdId) {
          return false
        }
        if (!q) return true

        const matchTujuan =
          t.tujuan.toLowerCase().includes(q) ||
          (t.opd?.nama || '').toLowerCase().includes(q) ||
          (t.opd?.kode || '').toLowerCase().includes(q) ||
          (t.sumber_data?.nama || '').toLowerCase().includes(q) ||
          (t.keterangan || '').toLowerCase().includes(q)

        if (matchTujuan) return true

        const childSasarans = sasaransByTujuan[t.id] || []
        for (const s of childSasarans) {
          if (s.sasaran.toLowerCase().includes(q)) return true
          const childInds = indikatorsBySasaran[s.id] || []
          for (const ind of childInds) {
            if (
              ind.indikator.toLowerCase().includes(q) ||
              ind.jenis.toLowerCase().includes(q)
            ) {
              return true
            }
          }
        }
        return false
      })
      .sort((a, b) => {
        if (a.opd_id !== b.opd_id) {
          return (a.opd?.nama || '').localeCompare(b.opd?.nama || '')
        }
        return a.urutan - b.urutan
      })
  }, [localTujuans, selectedOpdId, searchQuery, sasaransByTujuan, indikatorsBySasaran])

  // Group filtered Tujuans by OPD when selectedOpdId === 'all'
  const tujuansByOpd = useMemo(() => {
    const groups: OpdGroupItem[] = []

    const map = new Map<string, OpdGroupItem>()

    for (const t of filteredTujuans) {
      const opdId = t.opd_id
      let group = map.get(opdId)
      if (!group) {
        group = {
          opdId,
          opdNama: t.opd?.nama || 'Perangkat Daerah',
          opdKode: t.opd?.kode || '',
          tujuans: [],
          totalSasaran: 0,
          totalIndikator: 0,
        }
        map.set(opdId, group)
        groups.push(group)
      }
      group.tujuans.push(t)

      const sList = sasaransByTujuan[t.id] || []
      group.totalSasaran += sList.length
      for (const s of sList) {
        const iList = indikatorsBySasaran[s.id] || []
        group.totalIndikator += iList.length
      }
    }

    return groups
  }, [filteredTujuans, sasaransByTujuan, indikatorsBySasaran])

  const allExpanded = useMemo(() => {
    if (filteredTujuans.length === 0) return true
    if (!isOpdRole && selectedOpdId === 'all') {
      return tujuansByOpd.every((g) => expandedOpds[g.opdId])
    }
    return filteredTujuans.every((t) => !collapsedTujuan[t.id])
  }, [filteredTujuans, isOpdRole, selectedOpdId, tujuansByOpd, expandedOpds, collapsedTujuan])

  function handleToggleAll() {
    if (allExpanded) {
      if (!isOpdRole && selectedOpdId === 'all') {
        setExpandedOpds({})
      } else {
        const nextTujuan: Record<string, boolean> = {}
        const nextSasaran: Record<string, boolean> = {}
        for (const t of filteredTujuans) {
          nextTujuan[t.id] = true
          for (const s of sasaransByTujuan[t.id] || []) {
            nextSasaran[s.id] = true
          }
        }
        setCollapsedTujuan(nextTujuan)
        setCollapsedSasaran(nextSasaran)
      }
    } else {
      if (!isOpdRole && selectedOpdId === 'all') {
        const nextExpanded: Record<string, boolean> = {}
        for (const g of tujuansByOpd) {
          nextExpanded[g.opdId] = true
        }
        setExpandedOpds(nextExpanded)
      }
      setCollapsedTujuan({})
      setCollapsedSasaran({})
    }
  }

  function toggleOpd(opdId: string) {
    setExpandedOpds((prev) => ({ ...prev, [opdId]: !prev[opdId] }))
  }

  function toggleTujuan(id: string) {
    setCollapsedTujuan((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleSasaran(id: string) {
    setCollapsedSasaran((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // ==========================================
  // REORDER HELPERS (DRAG & DROP + UP/DOWN)
  // ==========================================

  async function applyReorderTujuan(opdId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const siblings = localTujuans
      .filter((t) => t.opd_id === opdId)
      .sort((a, b) => a.urutan - b.urutan)

    const fromIndex = siblings.findIndex((t) => t.id === sourceId)
    const toIndex = siblings.findIndex((t) => t.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...siblings]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    const updatedIds = reordered.map((item) => item.id)
    const urutanMap = new Map(updatedIds.map((id, idx) => [id, idx + 1]))

    setLocalTujuans((prev) =>
      prev.map((item) =>
        urutanMap.has(item.id)
          ? { ...item, urutan: urutanMap.get(item.id)! }
          : item
      )
    )

    try {
      await perencanaanService.reorderTujuan(updatedIds)
      toast.success('Urutan tujuan berhasil diperbarui.')
      onRefresh()
    } catch {
      toast.error('Gagal menyimpan urutan tujuan.')
      onRefresh()
    }
  }

  async function applyReorderSasaran(tujuanId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const siblings = [...(sasaransByTujuan[tujuanId] || [])]
    const fromIndex = siblings.findIndex((s) => s.id === sourceId)
    const toIndex = siblings.findIndex((s) => s.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return

    const [moved] = siblings.splice(fromIndex, 1)
    siblings.splice(toIndex, 0, moved)

    const updatedIds = siblings.map((item) => item.id)
    const urutanMap = new Map(updatedIds.map((id, idx) => [id, idx + 1]))

    setLocalSasarans((prev) =>
      prev.map((item) =>
        urutanMap.has(item.id)
          ? { ...item, urutan: urutanMap.get(item.id)! }
          : item
      )
    )

    try {
      await perencanaanService.reorderSasaran(updatedIds)
      toast.success('Urutan sasaran berhasil diperbarui.')
      onRefresh()
    } catch {
      toast.error('Gagal menyimpan urutan sasaran.')
      onRefresh()
    }
  }

  async function applyReorderIndikator(sasaranId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const siblings = [...(indikatorsBySasaran[sasaranId] || [])]
    const fromIndex = siblings.findIndex((i) => i.id === sourceId)
    const toIndex = siblings.findIndex((i) => i.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return

    const [moved] = siblings.splice(fromIndex, 1)
    siblings.splice(toIndex, 0, moved)

    const updatedIds = siblings.map((item) => item.id)
    const urutanMap = new Map(updatedIds.map((id, idx) => [id, idx + 1]))

    setLocalIndikators((prev) =>
      prev.map((item) =>
        urutanMap.has(item.id)
          ? { ...item, urutan: urutanMap.get(item.id)! }
          : item
      )
    )

    try {
      await perencanaanService.reorderIndikator(updatedIds)
      toast.success('Urutan indikator berhasil diperbarui.')
      onRefresh()
    } catch {
      toast.error('Gagal menyimpan urutan indikator.')
      onRefresh()
    }
  }

  return {
    canCreate,
    canEdit,
    canDelete,
    searchQuery,
    setSearchQuery,
    selectedOpdId,
    setSelectedOpdId,
    opdOptions,
    collapsedTujuan,
    setCollapsedTujuan,
    collapsedSasaran,
    setCollapsedSasaran,
    expandedOpds,
    allExpanded,
    handleToggleAll,
    toggleOpd,
    toggleTujuan,
    toggleSasaran,
    dragState,
    setDragState,
    dragOverId,
    setDragOverId,
    sasaransByTujuan,
    indikatorsBySasaran,
    filteredTujuans,
    tujuansByOpd,
    applyReorderTujuan,
    applyReorderSasaran,
    applyReorderIndikator,
  }
}

export type UseTujuanTableStateReturn = ReturnType<typeof useTujuanTableState>
