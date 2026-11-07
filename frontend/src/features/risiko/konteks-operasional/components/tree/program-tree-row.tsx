import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  KonteksOperasionalItemJenis,
  KonteksOperasionalItemNode,
} from '@/types/risiko'
import { KegiatanTreeRow } from './kegiatan-tree-row'

export interface ProgramTreeRowProps {
  program: KonteksOperasionalItemNode
  progIdx: number
  totalPrograms: number
  isProgCollapsed: boolean
  collapsedKegiatans: Record<string, boolean>
  canEdit: boolean
  onToggleCollapse: () => void
  onToggleCollapseKegiatan: (kegiatanId: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddChild: (
    parent: KonteksOperasionalItemNode,
    targetJenis: KonteksOperasionalItemJenis
  ) => void
  onEdit: (item: KonteksOperasionalItemNode) => void
  onDelete: (item: KonteksOperasionalItemNode) => void
  onMoveKegiatan: (
    program: KonteksOperasionalItemNode,
    kegIdx: number,
    direction: 'up' | 'down'
  ) => void
  onMoveSubKegiatan: (
    kegiatan: KonteksOperasionalItemNode,
    subIdx: number,
    direction: 'up' | 'down'
  ) => void
}

export function ProgramTreeRow({
  program,
  progIdx,
  totalPrograms,
  isProgCollapsed,
  collapsedKegiatans,
  canEdit,
  onToggleCollapse,
  onToggleCollapseKegiatan,
  onMoveUp,
  onMoveDown,
  onAddChild,
  onEdit,
  onDelete,
  onMoveKegiatan,
  onMoveSubKegiatan,
}: ProgramTreeRowProps) {
  const childKegiatans = program.children || []
  const hasKegiatans = childKegiatans.length > 0

  return (
    <div className='rounded-xl border bg-card shadow-xs transition-all overflow-hidden hover:border-primary/30'>
      {/* Level 1 Header: Program */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent'>
        <div className='flex items-start gap-2.5 min-w-0 flex-1'>
          {/* Reorder Buttons for Program */}
          {canEdit && totalPrograms > 1 && (
            <div className='flex flex-col pt-0.5 shrink-0'>
              <button
                type='button'
                disabled={progIdx === 0}
                onClick={onMoveUp}
                title='Geser Program ke atas'
                className='text-muted-foreground hover:text-primary disabled:opacity-25 p-0.5'
              >
                <ArrowUp className='h-2.5 w-2.5' />
              </button>
              <button
                type='button'
                disabled={progIdx === totalPrograms - 1}
                onClick={onMoveDown}
                title='Geser Program ke bawah'
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
            className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
            title={isProgCollapsed ? 'Buka Kegiatan' : 'Tutup Kegiatan'}
          >
            {isProgCollapsed ? (
              <ChevronRight className='h-3.5 w-3.5' />
            ) : (
              <ChevronDown className='h-3.5 w-3.5' />
            )}
          </button>

          {/* Number Badge (A, B, C...) */}
          <div className='mt-0.5 flex h-6 min-w-6 px-1.5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold font-mono'>
            {program.kode}
          </div>

          {/* Program Content */}
          <div className='space-y-1.5 min-w-0 flex-1'>
            <div className='flex items-start gap-2'>
              <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5'>
                <FolderTree className='h-2.5 w-2.5' />
                Program
              </span>
              <p className='text-sm font-semibold text-foreground leading-relaxed break-words flex-1'>
                {program.nama}
              </p>
              <Badge variant='outline' className='text-[10px] text-muted-foreground shrink-0'>
                {childKegiatans.length} Kegiatan
              </Badge>
            </div>

            {/* Indikator & Target Program */}
            {program.indikators?.[0] && (
              <div className='pt-0.5'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-md border border-primary/20 bg-primary/[0.04] px-2.5 py-1 text-xs'>
                  <div className='flex items-start gap-1.5 min-w-0 flex-1'>
                    <Target className='h-3.5 w-3.5 text-primary shrink-0 mt-0.5' />
                    <span className='text-[11px] text-muted-foreground leading-relaxed break-words'>
                      <strong className='font-medium text-foreground mr-1'>Indikator:</strong>
                      {program.indikators[0].indikator}
                    </span>
                  </div>
                  <div className='flex items-center gap-1.5 shrink-0 self-start sm:self-center pl-4 sm:pl-0'>
                    <span className='text-[10px] text-muted-foreground font-semibold'>Target:</span>
                    <Badge
                      variant='secondary'
                      className='font-mono font-bold text-xs h-5 px-2 text-primary bg-primary/15 border-primary/20'
                    >
                      {program.indikators[0].target}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Level 1 Actions */}
        <div className='flex items-center gap-1.5 shrink-0 self-end sm:self-start sm:pt-0.5'>
          {canEdit && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              title='Tambah Kegiatan di bawah Program ini'
              onClick={() => {
                if (isProgCollapsed) onToggleCollapse()
                onAddChild(program, 'kegiatan')
              }}
              className='h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10'
            >
              <Plus className='h-3.5 w-3.5 mr-1' />
              Kegiatan
            </Button>
          )}

          {canEdit && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              title='Ubah Program'
              onClick={() => onEdit(program)}
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
              disabled={hasKegiatans}
              title={
                hasKegiatans
                  ? `Tidak dapat dihapus: masih memiliki ${childKegiatans.length} Kegiatan di bawahnya. Bersihkan data dari bawah terlebih dahulu.`
                  : 'Hapus Program'
              }
              onClick={() => onDelete(program)}
              className='h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
      </div>

      {/* LEVEL 2: DAFTAR KEGIATAN */}
      {!isProgCollapsed && (
        <div className='border-t bg-muted/[0.12] px-3 py-3 sm:px-4 sm:pl-8 space-y-2.5'>
          {childKegiatans.length === 0 ? (
            <div className='flex items-center justify-between rounded-lg border border-dashed bg-background/60 px-3.5 py-2.5 text-xs text-muted-foreground'>
              <span>Belum ada Kegiatan pada program ini.</span>
              {canEdit && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs text-primary hover:text-primary'
                  onClick={() => onAddChild(program, 'kegiatan')}
                >
                  <Plus className='h-3 w-3 mr-1' />
                  Tambah Kegiatan
                </Button>
              )}
            </div>
          ) : (
            childKegiatans.map((kegiatan, kegIdx) => (
              <KegiatanTreeRow
                key={kegiatan.id}
                program={program}
                kegiatan={kegiatan}
                kegIdx={kegIdx}
                totalKegiatan={childKegiatans.length}
                isKegCollapsed={Boolean(collapsedKegiatans[kegiatan.id])}
                canEdit={canEdit}
                onToggleCollapse={() => onToggleCollapseKegiatan(kegiatan.id)}
                onMoveUp={() => onMoveKegiatan(program, kegIdx, 'up')}
                onMoveDown={() => onMoveKegiatan(program, kegIdx, 'down')}
                onAddSubKegiatan={(p) => onAddChild(p, 'sub_kegiatan')}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveSubKegiatan={onMoveSubKegiatan}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
