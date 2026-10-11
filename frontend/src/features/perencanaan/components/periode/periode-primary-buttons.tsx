import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { usePeriode } from './periode-provider'
import { usePeriodeOverview } from '../../hooks/use-periode-query'
import { cn } from '@/lib/utils'

export function PeriodePrimaryButtons() {
  const { hasPermission, isSuperadmin } = usePermissions()
  const canManage = isSuperadmin || hasPermission('perencanaan.periode')
  const { setOpen, setCurrentRow } = usePeriode()
  const { isFetching, refetch } = usePeriodeOverview()

  return (
    <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
      <Button
        variant='outline'
        size='sm'
        className='h-9 text-xs'
        onClick={() => refetch()}
        disabled={isFetching}
      >
        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isFetching && 'animate-spin')} />
        Segarkan
      </Button>

      {canManage && (
        <Button
          size='sm'
          className='h-9 text-xs gap-1.5'
          onClick={() => {
            setCurrentRow(null)
            setOpen('create')
          }}
        >
          <Plus className='h-4 w-4' />
          Tambah Periode
        </Button>
      )}
    </div>
  )
}
