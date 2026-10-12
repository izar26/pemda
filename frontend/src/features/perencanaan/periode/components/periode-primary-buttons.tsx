import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { usePeriode } from './periode-provider'

export function PeriodePrimaryButtons() {
  const { setOpen, setCurrentRow } = usePeriode()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('periode.create')

  if (!canCreate) return null

  return (
    <Button
      size='sm'
      className='h-9 gap-1.5 text-xs shadow-sm'
      onClick={() => {
        setCurrentRow(null)
        setOpen('create')
      }}
    >
      <Plus className='h-4 w-4' />
      <span>Tambah Periode Penilaian</span>
    </Button>
  )
}
