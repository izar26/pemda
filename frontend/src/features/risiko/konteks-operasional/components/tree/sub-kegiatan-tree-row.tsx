import { ArrowDown, ArrowUp, Pencil, Target, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { KonteksOperasionalItemNode } from '@/types/risiko'

export interface SubKegiatanTreeRowProps {
  subKegiatan: KonteksOperasionalItemNode
  subIdx: number
  totalSub: number
  canEdit: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: (item: KonteksOperasionalItemNode) => void
  onDelete: (item: KonteksOperasionalItemNode) => void
}

export function SubKegiatanTreeRow({
  subKegiatan,
  subIdx,
  totalSub,
  canEdit,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: SubKegiatanTreeRowProps) {
  return (
    <div className='group/sub rounded-md border bg-card hover:bg-background hover:border-sky-500/40 transition-all p-2.5 space-y-2 border-l-4 border-l-sky-500/70'>
      {/* Baris 1: Header Sub Kegiatan (Reorder, Kode, Label, Nama, Tombol Aksi) */}
      <div className='flex items-start justify-between gap-2.5'>
        <div className='flex items-start gap-2 min-w-0 flex-1'>
          {/* Reorder Buttons for Sub Kegiatan */}
          {canEdit && totalSub > 1 && (
            <div className='flex flex-col pt-0.5 shrink-0'>
              <button
                type='button'
                disabled={subIdx === 0}
                onClick={onMoveUp}
                title='Geser Sub Kegiatan ke atas'
                className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
              >
                <ArrowUp className='h-2.5 w-2.5' />
              </button>
              <button
                type='button'
                disabled={subIdx === totalSub - 1}
                onClick={onMoveDown}
                title='Geser Sub Kegiatan ke bawah'
                className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
              >
                <ArrowDown className='h-2.5 w-2.5' />
              </button>
            </div>
          )}

          {/* Code Badge (A.1.1, A.1.2...) */}
          <span className='mt-0.5 inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground shrink-0'>
            {subKegiatan.kode}
          </span>

          <span className='inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
            Sub Kegiatan
          </span>

          {/* Nama Sub Kegiatan */}
          <p className='text-xs font-semibold text-foreground leading-relaxed break-words flex-1'>
            {subKegiatan.nama}
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className='flex items-center gap-0.5 shrink-0 self-start pt-0.5'>
          {canEdit && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              title='Ubah Sub Kegiatan'
              onClick={() => onEdit(subKegiatan)}
              className='h-6 w-6 text-muted-foreground hover:text-foreground'
            >
              <Pencil className='h-3 w-3' />
            </Button>
          )}

          {canEdit && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              title='Hapus Sub Kegiatan'
              onClick={() => onDelete(subKegiatan)}
              className='h-6 w-6 text-muted-foreground hover:text-destructive'
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          )}
        </div>
      </div>

      {/* Baris 2: Indikator & Target Sub Kegiatan */}
      {subKegiatan.indikators?.[0] && (
        <div className='pl-0 sm:pl-7'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-sky-500/20 bg-sky-500/[0.04] px-2.5 py-1.5 text-xs'>
            <div className='flex items-start gap-1.5 min-w-0 flex-1'>
              <Target className='h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5' />
              <div className='text-[11px] leading-relaxed break-words min-w-0 flex-1'>
                <span className='font-semibold text-foreground mr-1.5'>
                  Indikator Kinerja:
                </span>
                <span className='text-muted-foreground'>
                  {subKegiatan.indikators[0].indikator}
                </span>
              </div>
            </div>

            <div className='flex items-center gap-1.5 shrink-0 self-start sm:self-center pl-5 sm:pl-0 pt-0.5 sm:pt-0'>
              <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider'>
                Target:
              </span>
              <Badge
                variant='outline'
                className='font-mono font-bold text-xs h-5 px-2 text-foreground bg-background border-sky-500/30 shadow-2xs'
              >
                {subKegiatan.indikators[0].target}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
