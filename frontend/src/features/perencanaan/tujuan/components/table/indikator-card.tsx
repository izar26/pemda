import { ArrowDown, ArrowUp, FileCheck2, GripVertical, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { IndikatorPenilaianItem } from '@/types/perencanaan'
import type { DragState } from './types'

interface IndikatorCardProps {
  indikator: IndikatorPenilaianItem
  indIdx: number
  tujuanIdx: number
  sasaranIdx: number
  sasaranId: string
  childIndikators: IndikatorPenilaianItem[]
  canEdit: boolean
  canDelete: boolean
  dragState: DragState | null
  dragOverId: string | null
  setDragState: (val: DragState | null) => void
  setDragOverId: (val: string | null) => void
  applyReorderIndikator: (sasaranId: string, sourceId: string, targetId: string) => Promise<void>
  onEditIndikator: (indikator: IndikatorPenilaianItem) => void
  onDeleteIndikator: (indikator: IndikatorPenilaianItem) => void
}

export function IndikatorCard({
  indikator,
  indIdx,
  tujuanIdx,
  sasaranIdx,
  sasaranId,
  childIndikators,
  canEdit,
  canDelete,
  dragState,
  dragOverId,
  setDragState,
  setDragOverId,
  applyReorderIndikator,
  onEditIndikator,
  onDeleteIndikator,
}: IndikatorCardProps) {
  const isDraggingThisInd =
    dragState?.level === 'indikator' && dragState.id === indikator.id
  const isDragOverThisInd =
    dragState?.level === 'indikator' &&
    dragState.parentId === sasaranId &&
    dragOverId === indikator.id &&
    dragState.id !== indikator.id

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit) return
        e.stopPropagation()
        setDragState({
          level: 'indikator',
          id: indikator.id,
          parentId: sasaranId,
        })
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        if (
          !canEdit ||
          dragState?.level !== 'indikator' ||
          dragState.parentId !== sasaranId
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
          dragState.parentId === sasaranId
        ) {
          applyReorderIndikator(sasaranId, dragState.id, indikator.id)
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
                      sasaranId,
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
                  disabled={indIdx >= childIndikators.length - 1}
                  onClick={() =>
                    indIdx < childIndikators.length - 1 &&
                    applyReorderIndikator(
                      sasaranId,
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
            onClick={() => onEditIndikator(indikator)}
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
            onClick={() => onDeleteIndikator(indikator)}
          >
            <Trash2 className='h-3 w-3' />
          </Button>
        )}
      </div>
    </div>
  )
}
