import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { KonteksOperasionalItemNode } from '@/types/risiko'
import { SubKegiatanTreeRow } from './sub-kegiatan-tree-row'

export interface KegiatanTreeRowProps {
  program: KonteksOperasionalItemNode
  kegiatan: KonteksOperasionalItemNode
  kegIdx: number
  totalKegiatan: number
  isKegCollapsed: boolean
  canEdit: boolean
  onToggleCollapse: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddSubKegiatan: (parent: KonteksOperasionalItemNode) => void
  onEdit: (item: KonteksOperasionalItemNode) => void
  onDelete: (item: KonteksOperasionalItemNode) => void
  onMoveSubKegiatan: (
    kegiatan: KonteksOperasionalItemNode,
    subIdx: number,
    direction: 'up' | 'down'
  ) => void
}

export function KegiatanTreeRow({
  kegiatan,
  kegIdx,
  totalKegiatan,
  isKegCollapsed,
  canEdit,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
  onAddSubKegiatan,
  onEdit,
  onDelete,
  onMoveSubKegiatan,
}: KegiatanTreeRowProps) {
  const childSubKegiatans = kegiatan.children || []
  const hasSubKegiatans = childSubKegiatans.length > 0

  return (
    <div className='rounded-lg border bg-background hover:border-emerald-500/40 transition-all overflow-hidden border-l-4 border-l-emerald-500/70'>
      {/* Header Kegiatan */}
      <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 px-3.5 py-2.5'>
        <div className='flex items-start gap-2 min-w-0 flex-1'>
          {/* Reorder Buttons for Kegiatan */}
          {canEdit && totalKegiatan > 1 && (
            <div className='flex flex-col pt-0.5 shrink-0'>
              <button
                type='button'
                disabled={kegIdx === 0}
                onClick={onMoveUp}
                title='Geser Kegiatan ke atas'
                className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
              >
                <ArrowUp className='h-2.5 w-2.5' />
              </button>
              <button
                type='button'
                disabled={kegIdx === totalKegiatan - 1}
                onClick={onMoveDown}
                title='Geser Kegiatan ke bawah'
                className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
              >
                <ArrowDown className='h-2.5 w-2.5' />
              </button>
            </div>
          )}

          {/* Expand / Collapse Button */}
          <button
            type='button'
            onClick={onToggleCollapse}
            className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
            title={isKegCollapsed ? 'Buka Sub Kegiatan' : 'Tutup Sub Kegiatan'}
          >
            {isKegCollapsed ? (
              <ChevronRight className='h-3 w-3' />
            ) : (
              <ChevronDown className='h-3 w-3' />
            )}
          </button>

          {/* Code Badge (A.1, A.2...) */}
          <span className='mt-0.5 inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono font-semibold text-foreground shrink-0'>
            {kegiatan.kode}
          </span>

          {/* Kegiatan Content */}
          <div className='space-y-1.5 min-w-0 flex-1'>
            <div className='flex items-start gap-2'>
              <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
                <Target className='h-2.5 w-2.5' />
                Kegiatan
              </span>
              <p className='text-xs sm:text-sm font-semibold text-foreground leading-relaxed break-words flex-1'>
                {kegiatan.nama}
              </p>
              <Badge variant='outline' className='text-[10px] text-muted-foreground shrink-0'>
                {childSubKegiatans.length} Sub Kegiatan
              </Badge>
            </div>

            {/* Indikator & Target Kegiatan */}
            {kegiatan.indikators?.[0] && (
              <div className='pt-0.5'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] px-2.5 py-1 text-xs'>
                  <div className='flex items-start gap-1.5 min-w-0 flex-1'>
                    <Target className='h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
                    <span className='text-[11px] text-muted-foreground leading-relaxed break-words'>
                      <strong className='font-medium text-foreground mr-1'>Indikator:</strong>
                      {kegiatan.indikators[0].indikator}
                    </span>
                  </div>
                  <div className='flex items-center gap-1.5 shrink-0 self-start sm:self-center pl-4 sm:pl-0'>
                    <span className='text-[10px] text-muted-foreground font-semibold'>Target:</span>
                    <Badge
                      variant='outline'
                      className='font-mono font-bold text-[10px] h-4.5 px-1.5 text-foreground bg-background border-emerald-500/30'
                    >
                      {kegiatan.indikators[0].target}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Level 2 Actions */}
        <div className='flex items-center gap-1 shrink-0 self-start pt-0.5'>
          {canEdit && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              title='Tambah Sub Kegiatan di bawah Kegiatan ini'
              onClick={() => onAddSubKegiatan(kegiatan)}
              className='h-7 px-2 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
            >
              <Plus className='h-3 w-3 mr-1' />
              Sub Kegiatan
            </Button>
          )}

          {canEdit && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              title='Ubah Kegiatan'
              onClick={() => onEdit(kegiatan)}
              className='h-7 w-7 text-muted-foreground hover:text-foreground'
            >
              <Pencil className='h-3.5 w-3.5' />
            </Button>
          )}

          {canEdit && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={hasSubKegiatans}
              title={
                hasSubKegiatans
                  ? `Tidak dapat dihapus: masih memiliki ${childSubKegiatans.length} Sub Kegiatan di bawahnya. Bersihkan data dari bawah terlebih dahulu.`
                  : 'Hapus Kegiatan'
              }
              onClick={() => onDelete(kegiatan)}
              className='h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
      </div>

      {/* LEVEL 3: DAFTAR SUB KEGIATAN */}
      {!isKegCollapsed && (
        <div className='border-t bg-muted/[0.18] px-2.5 py-2.5 sm:px-3 sm:pl-6 space-y-2'>
          {childSubKegiatans.length === 0 ? (
            <div className='flex items-center justify-between rounded-md border border-dashed bg-background/60 px-3 py-2 text-[11px] text-muted-foreground'>
              <span>Belum ada Sub Kegiatan pada kegiatan ini.</span>
              {canEdit && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-6 px-2 text-[11px] text-primary hover:text-primary'
                  onClick={() => onAddSubKegiatan(kegiatan)}
                >
                  <Plus className='h-3 w-3 mr-1' />
                  Tambah Sub Kegiatan
                </Button>
              )}
            </div>
          ) : (
            childSubKegiatans.map((subKegiatan, subIdx) => (
              <SubKegiatanTreeRow
                key={subKegiatan.id}
                subKegiatan={subKegiatan}
                subIdx={subIdx}
                totalSub={childSubKegiatans.length}
                canEdit={canEdit}
                onMoveUp={() => onMoveSubKegiatan(kegiatan, subIdx, 'up')}
                onMoveDown={() => onMoveSubKegiatan(kegiatan, subIdx, 'down')}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
