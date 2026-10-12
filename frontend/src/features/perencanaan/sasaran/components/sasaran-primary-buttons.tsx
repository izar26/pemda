import { Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { useSasaran } from './sasaran-provider'

export function SasaranPrimaryButtons() {
  const { setOpen, setCurrentRow } = useSasaran()
  const { hasPermission } = usePermissions()

  const canCopy = hasPermission('sasaran.copy')
  const canCreate = hasPermission('sasaran.create')

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
          Tambah Sasaran
        </Button>
      )}
    </>
  )
}
