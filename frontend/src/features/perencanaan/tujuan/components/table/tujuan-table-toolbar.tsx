import { ChevronsDownUp, ChevronsUpDown, Search as SearchIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/searchable-select'

interface TujuanTableToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedOpdId: string
  onOpdChange: (value: string) => void
  opdOptions: Array<{ value: string; label: string }>
  isOpdRole: boolean
  allExpanded: boolean
  onToggleAll: () => void
}

export function TujuanTableToolbar({
  searchQuery,
  onSearchChange,
  selectedOpdId,
  onOpdChange,
  opdOptions,
  isOpdRole,
  allExpanded,
  onToggleAll,
}: TujuanTableToolbarProps) {
  const hasActiveFilter = searchQuery || (!isOpdRole && selectedOpdId !== 'all')

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-xs'>
      <div className='flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
        <div className='relative flex-1 max-w-md'>
          <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='Cari tujuan, sasaran, indikator, atau sumber data...'
            className='pl-8 pr-8 h-9 text-xs'
          />
          {searchQuery && (
            <button
              type='button'
              onClick={() => onSearchChange('')}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
            >
              <X className='h-3.5 w-3.5' />
            </button>
          )}
        </div>

        {!isOpdRole && (
          <div className='w-full sm:w-72'>
            <SearchableSelect
              options={opdOptions}
              value={selectedOpdId}
              onValueChange={(val) => onOpdChange(val || 'all')}
              placeholder='Filter Perangkat Daerah (OPD)...'
              searchPlaceholder='Cari nama atau kode OPD...'
              emptyMessage='OPD tidak ditemukan.'
            />
          </div>
        )}

        {hasActiveFilter && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              onSearchChange('')
              onOpdChange('all')
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
          onClick={onToggleAll}
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
  )
}
