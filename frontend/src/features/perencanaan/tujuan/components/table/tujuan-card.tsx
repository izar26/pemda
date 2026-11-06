import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronDown,
  ChevronRight,
  Database,
  Flag,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'
import { SasaranCard } from './sasaran-card'
import type { DragState } from './types'

interface TujuanCardProps {
  tujuan: TujuanPenilaianItem
  tujuanIdx: number
  filteredTujuans: TujuanPenilaianItem[]
  sasaransByTujuan: Record<string, SasaranPenilaianItem[]>
  indikatorsBySasaran: Record<string, IndikatorPenilaianItem[]>
  isTujuanCollapsed: boolean
  collapsedSasaran: Record<string, boolean>
  toggleTujuan: (id: string) => void
  toggleSasaran: (id: string) => void
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  dragState: DragState | null
  dragOverId: string | null
  setDragState: (val: DragState | null) => void
  setDragOverId: (val: string | null) => void
  applyReorderTujuan: (opdId: string, sourceId: string, targetId: string) => Promise<void>
  applyReorderSasaran: (tujuanId: string, sourceId: string, targetId: string) => Promise<void>
  applyReorderIndikator: (sasaranId: string, sourceId: string, targetId: string) => Promise<void>
  onCreateSasaran: (tujuan: TujuanPenilaianItem) => void
  onEditTujuan: (tujuan: TujuanPenilaianItem) => void
  onDeleteTujuan: (tujuan: TujuanPenilaianItem) => void
  onCreateIndikator: (tujuan: TujuanPenilaianItem, sasaran: SasaranPenilaianItem) => void
  onEditSasaran: (tujuan: TujuanPenilaianItem, sasaran: SasaranPenilaianItem) => void
  onDeleteSasaran: (sasaran: SasaranPenilaianItem) => void
  onEditIndikator: (sasaran: SasaranPenilaianItem, indikator: IndikatorPenilaianItem) => void
  onDeleteIndikator: (indikator: IndikatorPenilaianItem) => void
}

export function TujuanCard({
  tujuan,
  tujuanIdx,
  filteredTujuans,
  sasaransByTujuan,
  indikatorsBySasaran,
  isTujuanCollapsed,
  collapsedSasaran,
  toggleTujuan,
  toggleSasaran,
  canCreate,
  canEdit,
  canDelete,
  dragState,
  dragOverId,
  setDragState,
  setDragOverId,
  applyReorderTujuan,
  applyReorderSasaran,
  applyReorderIndikator,
  onCreateSasaran,
  onEditTujuan,
  onDeleteTujuan,
  onCreateIndikator,
  onEditSasaran,
  onDeleteSasaran,
  onEditIndikator,
  onDeleteIndikator,
}: TujuanCardProps) {
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
              onClick={() => onCreateSasaran(tujuan)}
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
              onClick={() => onEditTujuan(tujuan)}
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
              onClick={() => onDeleteTujuan(tujuan)}
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
                  onClick={() => onCreateSasaran(tujuan)}
                >
                  <Plus className='h-3 w-3 mr-1' />
                  Tambah Sasaran
                </Button>
              )}
            </div>
          ) : (
            childSasarans.map((sasaran, sasaranIdx) => (
              <SasaranCard
                key={sasaran.id}
                sasaran={sasaran}
                sasaranIdx={sasaranIdx}
                tujuanIdx={tujuanIdx}
                tujuan={tujuan}
                childSasarans={childSasarans}
                indikatorsBySasaran={indikatorsBySasaran}
                isSasaranCollapsed={Boolean(collapsedSasaran[sasaran.id])}
                toggleSasaran={toggleSasaran}
                canCreate={canCreate}
                canEdit={canEdit}
                canDelete={canDelete}
                dragState={dragState}
                dragOverId={dragOverId}
                setDragState={setDragState}
                setDragOverId={setDragOverId}
                applyReorderSasaran={applyReorderSasaran}
                applyReorderIndikator={applyReorderIndikator}
                onCreateIndikator={onCreateIndikator}
                onEditSasaran={onEditSasaran}
                onDeleteSasaran={onDeleteSasaran}
                onEditIndikator={onEditIndikator}
                onDeleteIndikator={onDeleteIndikator}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
