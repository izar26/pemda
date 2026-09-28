import { MailPlus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUsers } from './users-provider'
import { usePermissions } from '@/hooks/use-permissions'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  const { hasPermission } = usePermissions()

  if (!hasPermission('users.create')) return null

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        className='h-9 text-xs'
        onClick={() => setOpen('invite')}
      >
        <MailPlus className='h-4 w-4 mr-1.5' />
        Undang Pegawai
      </Button>

      <Button size='sm' className='h-9 text-xs' onClick={() => setOpen('add')}>
        <UserPlus className='h-4 w-4 mr-1.5' />
        Tambah Pegawai Baru
      </Button>
    </div>
  )
}

