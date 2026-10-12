import { Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { useIku } from './iku-provider'

export function IkuPrimaryButtons() {
  const { setOpen, setCurrentRow } = useIku()
  const { hasPermission } = usePermissions()

  const canCopy = hasPermission('iku.copy')
  const canCreate = hasPermission('iku.create')

  if (!canCopy && !canCreate) {
    return null
  }

  return (
    <>
      {canCopy && (
        <Button
          variant='outline'
          size='sm'
          className='h-9 text-xs border-dashed border-primary/40 text-primary hover:bg-primary/5'
          onClick={() => {
            setCurrentRow(null)
            setOpen('copy')
          }}
        >
          <Copy className='h-4 w-4 mr-1.5' />
          Salin dari Periode Lain
        </Button>
      )}

      {canCreate && (
        <Button
          size='sm'
          className='h-9 text-xs'
          onClick={() => {
            setCurrentRow(null)
            setOpen('create')
          }}
        >
          <Plus className='h-4 w-4 mr-1.5' />
          Tambah Indikator / IKU
        </Button>
      )}
    </>
  )
}
