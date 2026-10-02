import { type Row } from '@tanstack/react-table'
import { Copy, Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { OpdItem } from '@/types/opd'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermissions } from '@/hooks/use-permissions'
import { useOpd } from './opd-provider'

interface OpdRowActionsProps {
  row: Row<OpdItem>
}

export function OpdRowActions({ row }: OpdRowActionsProps) {
  const opd = row.original
  const { setOpen, setCurrentRow } = useOpd()
  const { hasPermission } = usePermissions()

  const canEdit = hasPermission('opd.edit')
  const canDelete = hasPermission('opd.delete')

  function handleCopyCode() {
    navigator.clipboard.writeText(opd.kode)
    toast.success('Kode OPD disalin', {
      description: `Kode "${opd.kode}" telah disalin ke clipboard.`,
    })
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Buka menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[170px]'>
        <DropdownMenuItem onClick={handleCopyCode} className='text-xs'>
          <Copy className='mr-2 h-3.5 w-3.5 text-muted-foreground' />
          Salin Kode OPD
        </DropdownMenuItem>

        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(opd)
              setOpen('edit')
            }}
            className='text-xs'
          >
            <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground' />
            Edit Instansi
          </DropdownMenuItem>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(opd)
                setOpen('delete')
              }}
              className='text-xs text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-3.5 w-3.5' />
              Hapus OPD
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
