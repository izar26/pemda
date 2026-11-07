import { Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface OperasionalTreeToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  summary: {
    progCount: number
    kegCount: number
    subCount: number
  }
  hasPrograms: boolean
  allExpanded: boolean
  onToggleAll: () => void
  canEdit: boolean
  onAddProgram: () => void
}

export function OperasionalTreeToolbar({
  searchQuery,
  onSearchChange,
  summary,
  hasPrograms,
  allExpanded,
  onToggleAll,
  canEdit,
  onAddProgram,
}: OperasionalTreeToolbarProps) {
  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
      <div className='relative flex-1 max-w-md'>
        <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          type='search'
          placeholder='Cari kode NO, nama program, kegiatan, sub kegiatan, atau indikator...'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-8 text-xs h-9 bg-background'
        />
      </div>

      <div className='flex items-center gap-2 shrink-0 flex-wrap'>
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground mr-1 flex-wrap'>
          <Badge variant='outline' className='text-[10px] font-mono'>
            {summary.progCount} Program
          </Badge>
          <Badge variant='outline' className='text-[10px] font-mono'>
            {summary.kegCount} Kegiatan
          </Badge>
          <Badge variant='outline' className='text-[10px] font-mono'>
            {summary.subCount} Sub Kegiatan
          </Badge>
        </div>

        {hasPrograms && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onToggleAll}
            className='h-8 text-xs'
          >
            {allExpanded ? 'Tutup Semua' : 'Buka Semua'}
          </Button>
        )}

        {canEdit && (
          <Button
            type='button'
            size='sm'
            onClick={onAddProgram}
            className='h-8 text-xs gap-1.5 shadow-2xs'
          >
            <Plus className='h-3.5 w-3.5' />
            <span>Tambah Program</span>
          </Button>
        )}
      </div>
    </div>
  )
}
