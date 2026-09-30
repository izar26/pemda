import { type Row } from '@tanstack/react-table'
import { Edit, KeyRound, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Role } from '@/types/rbac'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermissions } from '@/hooks/use-permissions'
import { useRoles } from './roles-provider'

interface RoleRowActionsProps {
  row: Row<Role>
}

export function RoleRowActions({ row }: RoleRowActionsProps) {
  const { setOpen, setCurrentRow, setActiveTab } = useRoles()
  const { hasPermission } = usePermissions()
  const role = row.original

  const canEdit = hasPermission('roles.edit')
  const canDelete = hasPermission('roles.delete')
  const isSystemRole = Boolean(role.is_system)

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
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem
          onClick={() => {
            setActiveTab('matrix')
          }}
        >
          <KeyRound className='mr-2 h-4 w-4 text-primary' />
          Matriks Hak Akses
        </DropdownMenuItem>

        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(role)
              setOpen('edit')
            }}
          >
            <Edit className='mr-2 h-4 w-4' />
            Ubah Informasi Peran
          </DropdownMenuItem>
        )}

        {canDelete && !isSystemRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(role)
                setOpen('delete')
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Hapus Peran
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
