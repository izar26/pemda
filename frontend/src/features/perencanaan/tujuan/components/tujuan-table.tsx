import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Database,
  FileCheck2,
  Flag,
  FolderTree,
  Gauge,
  GripVertical,
  Pencil,
  Plus,
  Search as SearchIcon,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/searchable-select'
import { usePermissions } from '@/hooks/use-permissions'
import { perencanaanService } from '@/services/perencanaan-service'
import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { useTujuan } from './tujuan-provider'

interface TujuanTableProps {
  data: TujuanPenilaianItem[]
  sasarans: SasaranPenilaianItem[]
  indikators: IndikatorPenilaianItem[]
  opds: Array<{ id: string | number; nama: string; kode: string }>
  onRefresh: () => void
}

type DragLevel = 'tujuan' | 'sasaran' | 'indikator'

interface DragState {
  level: DragLevel
  id: string
  parentId: string
}

export function TujuanTable({
  data,
  sasarans,
  indikators,
  opds,
  onRefresh,
}: TujuanTableProps) {
  const {
    setOpen,
    setCurrentRow,
    setCurrentSasaran,
    setCurrentIndikator,
    setTableFilters,
  } = useTujuan()
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
    const groups: Array<{
      opdId: string
      opdNama: string
      opdKode: string
      tujuans: TujuanPenilaianItem[]
      totalSasaran: number
      totalIndikator: number
    }> = []

    const map = new Map<
      string,
      {
        opdId: string
        opdNama: string
        opdKode: string
        tujuans: TujuanPenilaianItem[]
        totalSasaran: number
        totalIndikator: number
      }
    >()

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
    if (selectedOpdId === 'all') {
      return tujuansByOpd.every((g) => expandedOpds[g.opdId])
    }
    return filteredTujuans.every((t) => !collapsedTujuan[t.id])
  }, [filteredTujuans, selectedOpdId, tujuansByOpd, expandedOpds, collapsedTujuan])

  function handleToggleAll() {
    if (allExpanded) {
      if (selectedOpdId === 'all') {
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
      if (selectedOpdId === 'all') {
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

  return (
    <div className='space-y-4'>
      {/* Toolbar: Search + OPD Filter + Expand/Collapse All */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-xs'>
        <div className='flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
          <div className='relative flex-1 max-w-md'>
            <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Cari tujuan, sasaran, indikator, atau sumber data...'
              className='pl-8 pr-8 h-9 text-xs'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>

          <div className='w-full sm:w-72'>
            <SearchableSelect
              options={opdOptions}
              value={selectedOpdId}
              onValueChange={(val) => setSelectedOpdId(val || 'all')}
              placeholder='Filter Perangkat Daerah (OPD)...'
              searchPlaceholder='Cari nama atau kode OPD...'
              emptyMessage='OPD tidak ditemukan.'
            />
          </div>

          {(searchQuery || selectedOpdId !== 'all') && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setSearchQuery('')
                setSelectedOpdId('all')
              }}
              className='h-9 px-2.5 text-xs text-muted-foreground'
            >
              Reset
              <X className='ml-1.5 h-3.5 w-3.5' />
            </Button>
          )}
        </div>

        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleToggleAll}
            className='h-9 text-xs'
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className='h-3.5 w-3.5 mr-1.5' />
                Tutup Semua
              </>
            ) : (
              <>
                <ChevronsUpDown className='h-3.5 w-3.5 mr-1.5' />
                Buka Semua
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredTujuans.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 py-14 px-4 text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3'>
            <FolderTree className='h-6 w-6' />
          </div>
          <h3 className='text-sm font-bold text-foreground'>
            Belum Ada Data Tujuan, Sasaran &amp; Indikator
          </h3>
          <p className='text-xs text-muted-foreground max-w-md mt-1'>
            {searchQuery || selectedOpdId !== 'all'
              ? 'Tidak ada pohon kinerja yang cocok dengan filter pencarian Anda.'
              : 'Mulai susun pohon kinerja dengan menambahkan Tujuan baru atau menyalin dari periode sebelumnya.'}
          </p>
          {canCreate && !searchQuery && selectedOpdId === 'all' && (
            <Button
              size='sm'
              className='mt-4 h-8 text-xs'
              onClick={() => {
                setCurrentRow(null)
                setOpen('create')
              }}
            >
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              Tambah Tujuan Pertama
            </Button>
          )}
        </div>
      ) : (
        (() => {
          const renderTujuanCard = (tujuan: TujuanPenilaianItem, tujuanIdx: number) => {
            const isTujuanCollapsed = Boolean(collapsedTujuan[tujuan.id])
            const childSasarans = sasaransByTujuan[tujuan.id] || []
            const opdSiblings = filteredTujuans.filter((t) => t.opd_id === tujuan.opd_id)
            const opdSiblingIdx = opdSiblings.findIndex((t) => t.id === tujuan.id)
            const isDraggingThisTujuan =
              dragState?.level === 'tujuan' && dragState.id === tujuan.id
            const isDragOverThisTujuan =
              dragState?.level === 'tujuan' &&
              dragState.parentId === tujuan.opd_id &&
              dragOverId === tujuan.id &&
              dragState.id !== tujuan.id

            const sumberLabel =
              tujuan.sumber_data?.nama || tujuan.keterangan || 'Renstra SKPD'

            return (
              <div
                key={tujuan.id}
                draggable={canEdit}
                onDragStart={(e) => {
                  if (!canEdit) return
                  e.stopPropagation()
                  setDragState({
                    level: 'tujuan',
                    id: tujuan.id,
                    parentId: tujuan.opd_id,
                  })
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (
                    !canEdit ||
                    dragState?.level !== 'tujuan' ||
                    dragState.parentId !== tujuan.opd_id
                  ) {
                    return
                  }
                  e.preventDefault()
                  e.stopPropagation()
                  if (dragOverId !== tujuan.id) {
                    setDragOverId(tujuan.id)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (
                    canEdit &&
                    dragState?.level === 'tujuan' &&
                    dragState.parentId === tujuan.opd_id
                  ) {
                    applyReorderTujuan(tujuan.opd_id, dragState.id, tujuan.id)
                  }
                  setDragState(null)
                  setDragOverId(null)
                }}
                onDragEnd={() => {
                  setDragState(null)
                  setDragOverId(null)
                }}
                className={`rounded-xl border bg-card shadow-xs transition-all overflow-hidden ${
                  isDraggingThisTujuan ? 'opacity-50 scale-[0.995]' : ''
                } ${
                  isDragOverThisTujuan
                    ? 'ring-2 ring-primary border-primary bg-primary/5'
                    : 'hover:border-primary/30'
                }`}
              >
                {/* LEVEL 1: BARIS TUJUAN */}
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent'>
                  <div className='flex items-start gap-2.5 min-w-0 flex-1'>
                    {/* Drag Handle + Quick Up/Down for Tujuan */}
                    {canEdit && (
                      <div className='flex items-center gap-0.5 pt-0.5 shrink-0'>
                        <div
                          title='Tarik ke atas atau ke bawah untuk mengubah urutan Tujuan'
                          className='cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary p-1 rounded hover:bg-muted transition-colors'
                        >
                          <GripVertical className='h-4 w-4' />
                        </div>
                        {opdSiblings.length > 1 && (
                          <div className='flex flex-col'>
                            <button
                              type='button'
                              disabled={opdSiblingIdx <= 0}
                              onClick={() =>
                                opdSiblingIdx > 0 &&
                                applyReorderTujuan(
                                  tujuan.opd_id,
                                  tujuan.id,
                                  opdSiblings[opdSiblingIdx - 1].id
                                )
                              }
                              title='Geser Tujuan ke atas'
                              className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                            >
                              <ArrowUp className='h-2.5 w-2.5' />
                            </button>
                            <button
                              type='button'
                              disabled={opdSiblingIdx >= opdSiblings.length - 1}
                              onClick={() =>
                                opdSiblingIdx < opdSiblings.length - 1 &&
                                applyReorderTujuan(
                                  tujuan.opd_id,
                                  tujuan.id,
                                  opdSiblings[opdSiblingIdx + 1].id
                                )
                              }
                              title='Geser Tujuan ke bawah'
                              className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                            >
                              <ArrowDown className='h-2.5 w-2.5' />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expand / Collapse Button */}
                    <button
                      type='button'
                      onClick={() => toggleTujuan(tujuan.id)}
                      className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                      title={isTujuanCollapsed ? 'Buka Sasaran' : 'Tutup Sasaran'}
                    >
                      {isTujuanCollapsed ? (
                        <ChevronRight className='h-3.5 w-3.5' />
                      ) : (
                        <ChevronDown className='h-3.5 w-3.5' />
                      )}
                    </button>

                    {/* Number Badge */}
                    <div className='mt-0.5 flex h-6 min-w-6 px-1.5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold'>
                      {tujuanIdx + 1}
                    </div>

                    {/* Tujuan Content */}
                    <div className='space-y-1.5 min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <Badge
                          variant='outline'
                          className='text-[10px] font-semibold bg-background/80'
                        >
                          <Building2 className='h-2.5 w-2.5 mr-1 text-primary' />
                          {tujuan.opd?.nama || '-'} ({tujuan.opd?.kode || '-'})
                        </Badge>

                        <Badge
                          variant='secondary'
                          className='text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                        >
                          <Database className='h-2.5 w-2.5 mr-1' />
                          Sumber Data: {sumberLabel}
                        </Badge>

                        <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                          {childSasarans.length} Sasaran
                        </Badge>
                      </div>

                      <div className='flex items-start gap-2'>
                        <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
                          <Flag className='h-2.5 w-2.5' />
                          Tujuan
                        </span>
                        <p className='text-sm font-semibold text-foreground leading-relaxed break-words'>
                          {tujuan.tujuan}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Level 1 Actions */}
                  <div className='flex items-center gap-1.5 shrink-0 self-end sm:self-center'>
                    {canCreate && (
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10'
                        onClick={() => {
                          setCollapsedTujuan((prev) => ({ ...prev, [tujuan.id]: false }))
                          setCurrentRow(tujuan)
                          setCurrentSasaran(null)
                          setOpen('create-sasaran')
                        }}
                      >
                        <Plus className='h-3.5 w-3.5 mr-1' />
                        Sasaran
                      </Button>
                    )}

                    {canEdit && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 text-muted-foreground hover:text-foreground'
                        title='Ubah Tujuan'
                        onClick={() => {
                          setCurrentRow(tujuan)
                          setOpen('edit')
                        }}
                      >
                        <Pencil className='h-3.5 w-3.5' />
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 text-muted-foreground hover:text-destructive'
                        title='Hapus Tujuan'
                        onClick={() => {
                          setCurrentRow(tujuan)
                          setOpen('delete')
                        }}
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    )}
                  </div>
                </div>

                {/* LEVEL 2: DAFTAR SASARAN DI BAWAH TUJUAN */}
                {!isTujuanCollapsed && (
                  <div className='border-t bg-muted/[0.15] px-4 py-3 pl-6 sm:pl-12 space-y-2.5'>
                    {childSasarans.length === 0 ? (
                      <div className='flex items-center justify-between rounded-lg border border-dashed bg-background/60 px-3.5 py-2.5 text-xs text-muted-foreground'>
                        <span>Belum ada Sasaran pada tujuan ini.</span>
                        {canCreate && (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 text-xs text-primary hover:text-primary'
                            onClick={() => {
                              setCurrentRow(tujuan)
                              setCurrentSasaran(null)
                              setOpen('create-sasaran')
                            }}
                          >
                            <Plus className='h-3 w-3 mr-1' />
                            Tambah Sasaran
                          </Button>
                        )}
                      </div>
                    ) : (
                      childSasarans.map((sasaran, sasaranIdx) => {
                        const isSasaranCollapsed = Boolean(collapsedSasaran[sasaran.id])
                        const childIndikators = indikatorsBySasaran[sasaran.id] || []
                        const isDraggingThisSasaran =
                          dragState?.level === 'sasaran' && dragState.id === sasaran.id
                        const isDragOverThisSasaran =
                          dragState?.level === 'sasaran' &&
                          dragState.parentId === tujuan.id &&
                          dragOverId === sasaran.id &&
                          dragState.id !== sasaran.id

                        return (
                          <div
                            key={sasaran.id}
                            draggable={canEdit}
                            onDragStart={(e) => {
                              if (!canEdit) return
                              e.stopPropagation()
                              setDragState({
                                level: 'sasaran',
                                id: sasaran.id,
                                parentId: tujuan.id,
                              })
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragOver={(e) => {
                              if (
                                !canEdit ||
                                dragState?.level !== 'sasaran' ||
                                dragState.parentId !== tujuan.id
                              ) {
                                return
                              }
                              e.preventDefault()
                              e.stopPropagation()
                              if (dragOverId !== sasaran.id) {
                                setDragOverId(sasaran.id)
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (
                                canEdit &&
                                dragState?.level === 'sasaran' &&
                                dragState.parentId === tujuan.id
                              ) {
                                applyReorderSasaran(tujuan.id, dragState.id, sasaran.id)
                              }
                              setDragState(null)
                              setDragOverId(null)
                            }}
                            onDragEnd={() => {
                              setDragState(null)
                              setDragOverId(null)
                            }}
                            className={`rounded-lg border bg-background transition-all ${
                              isDraggingThisSasaran ? 'opacity-50' : ''
                            } ${
                              isDragOverThisSasaran
                                ? 'ring-2 ring-primary border-primary bg-primary/5'
                                : 'hover:border-primary/30'
                            }`}
                          >
                            {/* Header Sasaran */}
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5'>
                              <div className='flex items-start gap-2 min-w-0 flex-1'>
                                {/* Drag Handle + Quick Up/Down for Sasaran */}
                                {canEdit && (
                                  <div className='flex items-center gap-0.5 pt-0.5 shrink-0'>
                                    <div
                                      title='Tarik ke atas atau ke bawah untuk mengubah urutan Sasaran'
                                      className='cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary p-0.5 rounded hover:bg-muted transition-colors'
                                    >
                                      <GripVertical className='h-3.5 w-3.5' />
                                    </div>
                                    {childSasarans.length > 1 && (
                                      <div className='flex flex-col'>
                                        <button
                                          type='button'
                                          disabled={sasaranIdx <= 0}
                                          onClick={() =>
                                            sasaranIdx > 0 &&
                                            applyReorderSasaran(
                                              tujuan.id,
                                              sasaran.id,
                                              childSasarans[sasaranIdx - 1].id
                                            )
                                          }
                                          title='Geser Sasaran ke atas'
                                          className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                        >
                                          <ArrowUp className='h-2.5 w-2.5' />
                                        </button>
                                        <button
                                          type='button'
                                          disabled={sasaranIdx >= childSasarans.length - 1}
                                          onClick={() =>
                                            sasaranIdx < childSasarans.length - 1 &&
                                            applyReorderSasaran(
                                              tujuan.id,
                                              sasaran.id,
                                              childSasarans[sasaranIdx + 1].id
                                            )
                                          }
                                          title='Geser Sasaran ke bawah'
                                          className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                        >
                                          <ArrowDown className='h-2.5 w-2.5' />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <button
                                  type='button'
                                  onClick={() => toggleSasaran(sasaran.id)}
                                  className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                                  title={
                                    isSasaranCollapsed ? 'Buka Indikator' : 'Tutup Indikator'
                                  }
                                >
                                  {isSasaranCollapsed ? (
                                    <ChevronRight className='h-3 w-3' />
                                  ) : (
                                    <ChevronDown className='h-3 w-3' />
                                  )}
                                </button>

                                <span className='mt-0.5 inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-semibold text-foreground shrink-0'>
                                  {tujuanIdx + 1}.{sasaranIdx + 1}
                                </span>

                                <div className='flex flex-wrap items-start gap-2 min-w-0 flex-1'>
                                  <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
                                    <Target className='h-2.5 w-2.5' />
                                    Sasaran
                                  </span>
                                  <p className='text-xs sm:text-sm font-medium text-foreground leading-relaxed flex-1 min-w-[180px]'>
                                    {sasaran.sasaran}
                                  </p>
                                  <Badge
                                    variant='outline'
                                    className='text-[10px] text-muted-foreground shrink-0'
                                  >
                                    {childIndikators.length} Indikator
                                  </Badge>
                                </div>
                              </div>

                              {/* Level 2 Actions */}
                              <div className='flex items-center gap-1 shrink-0 self-end sm:self-center'>
                                {canCreate && (
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='h-7 px-2 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                                    onClick={() => {
                                      setCollapsedSasaran((prev) => ({
                                        ...prev,
                                        [sasaran.id]: false,
                                      }))
                                      setCurrentRow(tujuan)
                                      setCurrentSasaran(sasaran)
                                      setCurrentIndikator(null)
                                      setOpen('create-indikator')
                                    }}
                                  >
                                    <Plus className='h-3 w-3 mr-1' />
                                    Indikator
                                  </Button>
                                )}

                                {canEdit && (
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7 text-muted-foreground hover:text-foreground'
                                    title='Ubah Sasaran'
                                    onClick={() => {
                                      setCurrentRow(tujuan)
                                      setCurrentSasaran(sasaran)
                                      setOpen('edit-sasaran')
                                    }}
                                  >
                                    <Pencil className='h-3.5 w-3.5' />
                                  </Button>
                                )}

                                {canDelete && (
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7 text-muted-foreground hover:text-destructive'
                                    title='Hapus Sasaran'
                                    onClick={() => {
                                      setCurrentSasaran(sasaran)
                                      setOpen('delete-sasaran')
                                    }}
                                  >
                                    <Trash2 className='h-3.5 w-3.5' />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* LEVEL 3: DAFTAR INDIKATOR DI BAWAH SASARAN */}
                            {!isSasaranCollapsed && (
                              <div className='border-t bg-muted/20 px-3.5 py-2.5 pl-6 sm:pl-11 space-y-1.5'>
                                {childIndikators.length === 0 ? (
                                  <div className='flex items-center justify-between rounded-md border border-dashed bg-background/60 px-3 py-2 text-[11px] text-muted-foreground'>
                                    <span>Belum ada Indikator pada sasaran ini.</span>
                                    {canCreate && (
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-6 px-2 text-[11px] text-primary'
                                        onClick={() => {
                                          setCurrentRow(tujuan)
                                          setCurrentSasaran(sasaran)
                                          setCurrentIndikator(null)
                                          setOpen('create-indikator')
                                        }}
                                      >
                                        <Plus className='h-3 w-3 mr-1' />
                                        Tambah Indikator
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  childIndikators.map((indikator, indIdx) => {
                                    const isDraggingThisInd =
                                      dragState?.level === 'indikator' &&
                                      dragState.id === indikator.id
                                    const isDragOverThisInd =
                                      dragState?.level === 'indikator' &&
                                      dragState.parentId === sasaran.id &&
                                      dragOverId === indikator.id &&
                                      dragState.id !== indikator.id

                                    return (
                                      <div
                                        key={indikator.id}
                                        draggable={canEdit}
                                        onDragStart={(e) => {
                                          if (!canEdit) return
                                          e.stopPropagation()
                                          setDragState({
                                            level: 'indikator',
                                            id: indikator.id,
                                            parentId: sasaran.id,
                                          })
                                          e.dataTransfer.effectAllowed = 'move'
                                        }}
                                        onDragOver={(e) => {
                                          if (
                                            !canEdit ||
                                            dragState?.level !== 'indikator' ||
                                            dragState.parentId !== sasaran.id
                                          ) {
                                            return
                                          }
                                          e.preventDefault()
                                          e.stopPropagation()
                                          if (dragOverId !== indikator.id) {
                                            setDragOverId(indikator.id)
                                          }
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          if (
                                            canEdit &&
                                            dragState?.level === 'indikator' &&
                                            dragState.parentId === sasaran.id
                                          ) {
                                            applyReorderIndikator(
                                              sasaran.id,
                                              dragState.id,
                                              indikator.id
                                            )
                                          }
                                          setDragState(null)
                                          setDragOverId(null)
                                        }}
                                        onDragEnd={() => {
                                          setDragState(null)
                                          setDragOverId(null)
                                        }}
                                        className={`flex items-center justify-between gap-2.5 rounded-md border bg-background px-3 py-2 transition-all ${
                                          isDraggingThisInd ? 'opacity-50' : ''
                                        } ${
                                          isDragOverThisInd
                                            ? 'ring-2 ring-primary border-primary bg-primary/5'
                                            : 'hover:border-primary/30'
                                        }`}
                                      >
                                        <div className='flex items-start gap-2 min-w-0 flex-1'>
                                          {/* Drag Handle + Quick Up/Down for Indikator */}
                                          {canEdit && (
                                            <div className='flex items-center gap-0.5 pt-0.5 shrink-0'>
                                              <div
                                                title='Tarik ke atas atau ke bawah untuk mengubah urutan Indikator'
                                                className='cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary p-0.5 rounded hover:bg-muted transition-colors'
                                              >
                                                <GripVertical className='h-3.5 w-3.5' />
                                              </div>
                                              {childIndikators.length > 1 && (
                                                <div className='flex flex-col'>
                                                  <button
                                                    type='button'
                                                    disabled={indIdx <= 0}
                                                    onClick={() =>
                                                      indIdx > 0 &&
                                                      applyReorderIndikator(
                                                        sasaran.id,
                                                        indikator.id,
                                                        childIndikators[indIdx - 1].id
                                                      )
                                                    }
                                                    title='Geser Indikator ke atas'
                                                    className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                                  >
                                                    <ArrowUp className='h-2 w-2' />
                                                  </button>
                                                  <button
                                                    type='button'
                                                    disabled={
                                                      indIdx >= childIndikators.length - 1
                                                    }
                                                    onClick={() =>
                                                      indIdx <
                                                        childIndikators.length - 1 &&
                                                      applyReorderIndikator(
                                                        sasaran.id,
                                                        indikator.id,
                                                        childIndikators[indIdx + 1].id
                                                      )
                                                    }
                                                    title='Geser Indikator ke bawah'
                                                    className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
                                                  >
                                                    <ArrowDown className='h-2 w-2' />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          <span className='mt-0.5 inline-flex items-center justify-center rounded bg-muted/70 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground shrink-0'>
                                            {tujuanIdx + 1}.{sasaranIdx + 1}.{indIdx + 1}
                                          </span>

                                          {indikator.jenis === 'IKU' ? (
                                            <Badge className='mt-0.5 text-[10px] px-1.5 py-0 h-5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shrink-0'>
                                              <Sparkles className='h-2.5 w-2.5 mr-1' />
                                              IKU
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant='secondary'
                                              className='mt-0.5 text-[10px] px-1.5 py-0 h-5 shrink-0'
                                            >
                                              <FileCheck2 className='h-2.5 w-2.5 mr-1' />
                                              Biasa
                                            </Badge>
                                          )}

                                          <p className='text-xs text-foreground leading-relaxed break-words flex-1'>
                                            {indikator.indikator}
                                          </p>
                                        </div>

                                        {/* Level 3 Actions */}
                                        <div className='flex items-center gap-0.5 shrink-0'>
                                          {canEdit && (
                                            <Button
                                              variant='ghost'
                                              size='icon'
                                              className='h-6 w-6 text-muted-foreground hover:text-foreground'
                                              title='Ubah Indikator'
                                              onClick={() => {
                                                setCurrentSasaran(sasaran)
                                                setCurrentIndikator(indikator)
                                                setOpen('edit-indikator')
                                              }}
                                            >
                                              <Pencil className='h-3 w-3' />
                                            </Button>
                                          )}

                                          {canDelete && (
                                            <Button
                                              variant='ghost'
                                              size='icon'
                                              className='h-6 w-6 text-muted-foreground hover:text-destructive'
                                              title='Hapus Indikator'
                                              onClick={() => {
                                                setCurrentIndikator(indikator)
                                                setOpen('delete-indikator')
                                              }}
                                            >
                                              <Trash2 className='h-3 w-3' />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          }

          if (selectedOpdId === 'all') {
            return (
              /* MODE 1: PEMBUNGKUS PER OPD KETIKA FILTER "SEMUA OPD" AKTIF */
              <div className='space-y-4'>
                {tujuansByOpd.map((opdGroup) => {
                  const isOpdExpanded =
                    searchQuery.trim() !== '' ? true : Boolean(expandedOpds[opdGroup.opdId])

                  return (
                    <div
                      key={opdGroup.opdId}
                      className='rounded-2xl border bg-card/60 shadow-xs transition-all overflow-hidden'
                    >
                      {/* Header Pembungkus OPD */}
                      <div
                        onClick={() => toggleOpd(opdGroup.opdId)}
                        className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 cursor-pointer bg-gradient-to-r from-primary/[0.04] via-muted/20 to-transparent hover:bg-muted/40 transition-colors select-none'
                      >
                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                          <div
                            className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground transition-transform'
                            title={isOpdExpanded ? 'Tutup OPD' : 'Buka OPD'}
                          >
                            {isOpdExpanded ? (
                              <ChevronDown className='h-4 w-4' />
                            ) : (
                              <ChevronRight className='h-4 w-4' />
                            )}
                          </div>

                          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0'>
                            <Building2 className='h-4 w-4' />
                          </div>

                          <div className='space-y-0.5 min-w-0 flex-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <h3 className='text-sm font-bold text-foreground leading-snug break-words'>
                                {opdGroup.opdNama}
                              </h3>
                              {opdGroup.opdKode && (
                                <Badge
                                  variant='outline'
                                  className='text-[10px] font-semibold uppercase tracking-wider bg-background'
                                >
                                  {opdGroup.opdKode}
                                </Badge>
                              )}
                            </div>
                            <p className='text-xs text-muted-foreground'>
                              Klik untuk {isOpdExpanded ? 'menutup' : 'melihat'} pohon kinerja instansi ini
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap sm:flex-nowrap'>
                          <Badge
                            variant='secondary'
                            className='text-xs font-semibold bg-primary/10 text-primary border-primary/20'
                          >
                            <Flag className='h-3 w-3 mr-1 text-primary' />
                            {opdGroup.tujuans.length} Tujuan
                          </Badge>

                          <Badge
                            variant='outline'
                            className='text-xs font-medium bg-background text-muted-foreground'
                          >
                            <Target className='h-3 w-3 mr-1' />
                            {opdGroup.totalSasaran} Sasaran
                          </Badge>

                          <Badge
                            variant='outline'
                            className='text-xs font-medium bg-background text-muted-foreground'
                          >
                            <Gauge className='h-3 w-3 mr-1' />
                            {opdGroup.totalIndikator} Indikator
                          </Badge>

                          {canCreate && (
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10 ml-1'
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentRow(null)
                                setTableFilters((prev) => ({ ...prev, opd_id: opdGroup.opdId }))
                                setOpen('create')
                              }}
                            >
                              <Plus className='h-3.5 w-3.5 mr-1' />
                              Tujuan
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Konten Pohon Kinerja di Dalam OPD (Saat Dibuka) */}
                      {isOpdExpanded && (
                        <div className='border-t bg-muted/[0.04] p-3.5 sm:p-4 space-y-3'>
                          {opdGroup.tujuans.map((tujuan, idx) =>
                            renderTujuanCard(tujuan, idx)
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          }

          return (
            /* MODE 2: FILTER PER-OPD AKTIF (FLAT LIST SEPERTI BIASA) */
            <div className='space-y-3'>
              {filteredTujuans.map((tujuan, tujuanIdx) =>
                renderTujuanCard(tujuan, tujuanIdx)
              )}
            </div>
          )
        })()
      )}
    </div>
  )
}
