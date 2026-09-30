import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { useRoles } from './roles-provider'

export function RolesPrimaryButtons() {
  const { setOpen, setCurrentRow } = useRoles()
  const { hasPermission } = usePermissions()

  if (!hasPermission('roles.create')) return null

  return (
    <Button
      size='sm'
      className='h-9 text-xs font-medium'
      onClick={() => {
        setCurrentRow(null)
        setOpen('create')
      }}
    >
      <Plus className='h-4 w-4 mr-1.5' />
      Tambah Peran Baru
    </Button>
  )
}
