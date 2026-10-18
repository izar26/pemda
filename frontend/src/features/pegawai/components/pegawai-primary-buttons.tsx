import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { usePegawai } from './pegawai-provider'

export function PegawaiPrimaryButtons() {
  const { setOpen } = usePegawai()
  const { hasPermission } = usePermissions()

  if (!hasPermission('pegawai.create')) return null

  return (
    <Button size='sm' className='h-9 text-xs' onClick={() => setOpen('add')}>
      <UserPlus className='h-4 w-4 mr-1.5' />
      Tambah Pegawai
    </Button>
  )
}
