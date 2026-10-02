import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { useOpd } from './opd-provider'

export function OpdPrimaryButtons() {
  const { setOpen, setCurrentRow } = useOpd()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('opd.create')

  if (!canCreate) return null

  return (
    <Button
      size='sm'
      className='h-9 gap-1.5 text-xs'
      onClick={() => {
        setCurrentRow(null)
        setOpen('create')
      }}
    >
      <Plus className='h-4 w-4' />
      <span>Tambah OPD</span>
    </Button>
  )
}
