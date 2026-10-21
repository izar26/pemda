import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { usePenugasan } from './penugasan-provider'

export function PenugasanPrimaryButtons() {
  const { setOpen, setCurrentRow } = usePenugasan()
  const { hasPermission } = usePermissions()

  if (!hasPermission('penugasan_auditor.create')) return null

  return (
    <Button
      size='sm'
      className='h-9 gap-1.5 text-xs'
      onClick={() => {
        setCurrentRow(null)
        setOpen('add')
      }}
    >
      <Plus className='h-4 w-4' />
      <span>Tambah Penugasan</span>
    </Button>
  )
}
