import { type Row } from '@tanstack/react-table'
import { KeyRound, MoreHorizontal, Trash2, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type User } from '../data/schema'
import { useUsers } from './users-provider'
import { usePermissions } from '@/hooks/use-permissions'

interface DataTableRowActionsProps {
  row: Row<User>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useUsers()
  const { hasPermission } = usePermissions()
  const user = row.original

  const canEdit = hasPermission('users.edit')
  const canDelete = hasPermission('users.delete')
  const canReset2FA = hasPermission('users.reset_2fa')

  if (!canEdit && !canDelete && !canReset2FA) return null

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
      <DropdownMenuContent align='end' className='w-52'>
        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(user)
              setOpen('edit')
            }}
          >
            <UserPen className='mr-2 h-4 w-4 text-muted-foreground' />
            Edit Akun User
          </DropdownMenuItem>
        )}

        {canReset2FA && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(user)
              setOpen('reset-2fa')
            }}
          >
            <KeyRound className='mr-2 h-4 w-4 text-amber-500' />
            Reset 2FA User
          </DropdownMenuItem>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(user)
                setOpen('delete')
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Cabut Akun User
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
