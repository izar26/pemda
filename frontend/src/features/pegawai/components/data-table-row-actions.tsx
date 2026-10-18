import { type Row } from '@tanstack/react-table'
import { MoreHorizontal, Trash2, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type User } from '@/features/users/data/schema'
import { usePermissions } from '@/hooks/use-permissions'
import { usePegawai } from './pegawai-provider'

interface DataTableRowActionsProps {
  row: Row<User>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = usePegawai()
  const { hasPermission } = usePermissions()
  const pegawai = row.original

  const canEdit = hasPermission('pegawai.edit')
  const canDelete = hasPermission('pegawai.delete')

  if (!canEdit && !canDelete) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Buka menu aksi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(pegawai)
              setOpen('edit')
            }}
          >
            <UserPen className='mr-2 h-4 w-4 text-muted-foreground' />
            Edit Data Pegawai
          </DropdownMenuItem>
        )}

        {canEdit && canDelete && <DropdownMenuSeparator />}

        {canDelete && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(pegawai)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Hapus Pegawai
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
