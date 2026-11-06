import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { IndikatorCard } from './indikator-card'
import type { DragState } from './types'

interface SasaranCardProps {
  sasaran: SasaranPenilaianItem
  sasaranIdx: number
  tujuanIdx: number
  tujuan: TujuanPenilaianItem
  childSasarans: SasaranPenilaianItem[]
  indikatorsBySasaran: Record<string, IndikatorPenilaianItem[]>
  isSasaranCollapsed: boolean
  toggleSasaran: (id: string) => void
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  dragState: DragState | null
  dragOverId: string | null
  setDragState: (val: DragState | null) => void
  setDragOverId: (val: string | null) => void
  applyReorderSasaran: (tujuanId: string, sourceId: string, targetId: string) => Promise<void>
  applyReorderIndikator: (sasaranId: string, sourceId: string, targetId: string) => Promise<void>
  onCreateIndikator: (tujuan: TujuanPenilaianItem, sasaran: SasaranPenilaianItem) => void
  onEditSasaran: (tujuan: TujuanPenilaianItem, sasaran: SasaranPenilaianItem) => void
  onDeleteSasaran: (sasaran: SasaranPenilaianItem) => void
  onEditIndikator: (sasaran: SasaranPenilaianItem, indikator: IndikatorPenilaianItem) => void
  onDeleteIndikator: (indikator: IndikatorPenilaianItem) => void
}

export function SasaranCard({
  sasaran,
  sasaranIdx,
  tujuanIdx,
  tujuan,
  childSasarans,
  indikatorsBySasaran,
  isSasaranCollapsed,
  toggleSasaran,
  canCreate,
  canEdit,
  canDelete,
  dragState,
  dragOverId,
  setDragState,
  setDragOverId,
  applyReorderSasaran,
  applyReorderIndikator,
  onCreateIndikator,
  onEditSasaran,
  onDeleteSasaran,
  onEditIndikator,
  onDeleteIndikator,
}: SasaranCardProps) {
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
              onClick={() => onCreateIndikator(tujuan, sasaran)}
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
              onClick={() => onEditSasaran(tujuan, sasaran)}
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
              onClick={() => onDeleteSasaran(sasaran)}
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
                  onClick={() => onCreateIndikator(tujuan, sasaran)}
                >
                  <Plus className='h-3 w-3 mr-1' />
                  Tambah Indikator
                </Button>
              )}
            </div>
          ) : (
            childIndikators.map((indikator, indIdx) => (
              <IndikatorCard
                key={indikator.id}
                indikator={indikator}
                indIdx={indIdx}
                tujuanIdx={tujuanIdx}
                sasaranIdx={sasaranIdx}
                sasaranId={sasaran.id}
                childIndikators={childIndikators}
                canEdit={canEdit}
                canDelete={canDelete}
                dragState={dragState}
                dragOverId={dragOverId}
                setDragState={setDragState}
                setDragOverId={setDragOverId}
                applyReorderIndikator={applyReorderIndikator}
                onEditIndikator={() => onEditIndikator(sasaran, indikator)}
                onDeleteIndikator={onDeleteIndikator}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
