import { FolderTree, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { useTujuan } from './tujuan-provider'
import {
  TujuanCard,
  TujuanOpdGroup,
  TujuanTableToolbar,
  useTujuanTableState,
  type TujuanTableProps,
} from './table'

export * from './table'

export function TujuanTable({
  data,
  sasarans,
  indikators,
  opds,
  onRefresh,
  isOpdRole = false,
}: TujuanTableProps) {
  const {
    setOpen,
    setCurrentRow,
    setCurrentSasaran,
    setCurrentIndikator,
    setTableFilters,
  } = useTujuan()

  const state = useTujuanTableState({
    data,
    sasarans,
    indikators,
    opds,
    onRefresh,
    isOpdRole,
  })

  const handleCreateSasaran = (tujuan: TujuanPenilaianItem) => {
    state.setCollapsedTujuan((prev) => ({ ...prev, [tujuan.id]: false }))
    setCurrentRow(tujuan)
    setCurrentSasaran(null)
    setOpen('create-sasaran')
  }

  const handleEditTujuan = (tujuan: TujuanPenilaianItem) => {
    setCurrentRow(tujuan)
    setOpen('edit')
  }

  const handleDeleteTujuan = (tujuan: TujuanPenilaianItem) => {
    setCurrentRow(tujuan)
    setOpen('delete')
  }

  const handleCreateIndikator = (
    tujuan: TujuanPenilaianItem,
    sasaran: SasaranPenilaianItem
  ) => {
    state.setCollapsedSasaran((prev) => ({ ...prev, [sasaran.id]: false }))
    setCurrentRow(tujuan)
    setCurrentSasaran(sasaran)
    setCurrentIndikator(null)
    setOpen('create-indikator')
  }

  const handleEditSasaran = (
    tujuan: TujuanPenilaianItem,
    sasaran: SasaranPenilaianItem
  ) => {
    setCurrentRow(tujuan)
    setCurrentSasaran(sasaran)
    setOpen('edit-sasaran')
  }

  const handleDeleteSasaran = (sasaran: SasaranPenilaianItem) => {
    setCurrentSasaran(sasaran)
    setOpen('delete-sasaran')
  }

  const handleEditIndikator = (
    sasaran: SasaranPenilaianItem,
    indikator: IndikatorPenilaianItem
  ) => {
    setCurrentSasaran(sasaran)
    setCurrentIndikator(indikator)
    setOpen('edit-indikator')
  }

  const handleDeleteIndikator = (indikator: IndikatorPenilaianItem) => {
    setCurrentIndikator(indikator)
    setOpen('delete-indikator')
  }

  const handleCreateTujuanForOpd = (opdId: string) => {
    setCurrentRow(null)
    setTableFilters((prev) => ({ ...prev, opd_id: opdId }))
    setOpen('create')
  }

  return (
    <div className='space-y-4'>
      {/* Toolbar: Search + OPD Filter + Expand/Collapse All */}
      <TujuanTableToolbar
        searchQuery={state.searchQuery}
        onSearchChange={state.setSearchQuery}
        selectedOpdId={state.selectedOpdId}
        onOpdChange={state.setSelectedOpdId}
        opdOptions={state.opdOptions}
        isOpdRole={isOpdRole}
        allExpanded={state.allExpanded}
        onToggleAll={state.handleToggleAll}
      />

      {/* Empty State */}
      {state.filteredTujuans.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 py-14 px-4 text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3'>
            <FolderTree className='h-6 w-6' />
          </div>
          <h3 className='text-sm font-bold text-foreground'>
            Belum Ada Data Tujuan, Sasaran &amp; Indikator
          </h3>
          <p className='text-xs text-muted-foreground max-w-md mt-1'>
            {state.searchQuery || state.selectedOpdId !== 'all'
              ? 'Tidak ada pohon kinerja yang cocok dengan filter pencarian Anda.'
              : 'Mulai susun pohon kinerja dengan menambahkan Tujuan baru atau menyalin dari periode sebelumnya.'}
          </p>
          {state.canCreate && !state.searchQuery && state.selectedOpdId === 'all' && (
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
      ) : !isOpdRole && state.selectedOpdId === 'all' ? (
        /* MODE 1: PEMBUNGKUS PER OPD KETIKA FILTER "SEMUA OPD" AKTIF */
        <div className='space-y-4'>
          {state.tujuansByOpd.map((opdGroup) => {
            const isOpdExpanded =
              state.searchQuery.trim() !== ''
                ? true
                : Boolean(state.expandedOpds[opdGroup.opdId])

            return (
              <TujuanOpdGroup
                key={opdGroup.opdId}
                opdGroup={opdGroup}
                isOpdExpanded={isOpdExpanded}
                toggleOpd={state.toggleOpd}
                canCreate={state.canCreate}
                onCreateTujuanForOpd={handleCreateTujuanForOpd}
              >
                {opdGroup.tujuans.map((tujuan, idx) => (
                  <TujuanCard
                    key={tujuan.id}
                    tujuan={tujuan}
                    tujuanIdx={idx}
                    filteredTujuans={state.filteredTujuans}
                    sasaransByTujuan={state.sasaransByTujuan}
                    indikatorsBySasaran={state.indikatorsBySasaran}
                    isTujuanCollapsed={Boolean(state.collapsedTujuan[tujuan.id])}
                    collapsedSasaran={state.collapsedSasaran}
                    toggleTujuan={state.toggleTujuan}
                    toggleSasaran={state.toggleSasaran}
                    canCreate={state.canCreate}
                    canEdit={state.canEdit}
                    canDelete={state.canDelete}
                    dragState={state.dragState}
                    dragOverId={state.dragOverId}
                    setDragState={state.setDragState}
                    setDragOverId={state.setDragOverId}
                    applyReorderTujuan={state.applyReorderTujuan}
                    applyReorderSasaran={state.applyReorderSasaran}
                    applyReorderIndikator={state.applyReorderIndikator}
                    onCreateSasaran={handleCreateSasaran}
                    onEditTujuan={handleEditTujuan}
                    onDeleteTujuan={handleDeleteTujuan}
                    onCreateIndikator={handleCreateIndikator}
                    onEditSasaran={handleEditSasaran}
                    onDeleteSasaran={handleDeleteSasaran}
                    onEditIndikator={handleEditIndikator}
                    onDeleteIndikator={handleDeleteIndikator}
                  />
                ))}
              </TujuanOpdGroup>
            )
          })}
        </div>
      ) : (
        /* MODE 2: FILTER PER-OPD AKTIF (FLAT LIST SEPERTI BIASA) */
        <div className='space-y-3'>
          {state.filteredTujuans.map((tujuan, tujuanIdx) => (
            <TujuanCard
              key={tujuan.id}
              tujuan={tujuan}
              tujuanIdx={tujuanIdx}
              filteredTujuans={state.filteredTujuans}
              sasaransByTujuan={state.sasaransByTujuan}
              indikatorsBySasaran={state.indikatorsBySasaran}
              isTujuanCollapsed={Boolean(state.collapsedTujuan[tujuan.id])}
              collapsedSasaran={state.collapsedSasaran}
              toggleTujuan={state.toggleTujuan}
              toggleSasaran={state.toggleSasaran}
              canCreate={state.canCreate}
              canEdit={state.canEdit}
              canDelete={state.canDelete}
              dragState={state.dragState}
              dragOverId={state.dragOverId}
              setDragState={state.setDragState}
              setDragOverId={state.setDragOverId}
              applyReorderTujuan={state.applyReorderTujuan}
              applyReorderSasaran={state.applyReorderSasaran}
              applyReorderIndikator={state.applyReorderIndikator}
              onCreateSasaran={handleCreateSasaran}
              onEditTujuan={handleEditTujuan}
              onDeleteTujuan={handleDeleteTujuan}
              onCreateIndikator={handleCreateIndikator}
              onEditSasaran={handleEditSasaran}
              onDeleteSasaran={handleDeleteSasaran}
              onEditIndikator={handleEditIndikator}
              onDeleteIndikator={handleDeleteIndikator}
            />
          ))}
        </div>
      )}
    </div>
  )
}
