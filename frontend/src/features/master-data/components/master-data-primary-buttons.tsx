import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { useMasterData } from './master-data-provider'

export function MasterDataPrimaryButtons() {
  const { setOpen, setCurrentItem, selectedEntity, setTargetUnsurId } = useMasterData()
  const { hasPermission } = usePermissions()

  if (!hasPermission('master.create')) return null

  return (
    <Button
      size='sm'
      className='h-9 text-xs font-medium'
      onClick={() => {
        setCurrentItem(null)
        setTargetUnsurId(undefined)
        setOpen('create')
      }}
    >
      <Plus className='h-4 w-4 mr-1.5' />
      Tambah {selectedEntity.label}
    </Button>
  )
}
