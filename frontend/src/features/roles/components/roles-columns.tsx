import { type ColumnDef } from '@tanstack/react-table'
import { KeyRound, Shield, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import type { Role } from '@/types/rbac'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { RoleRowActions } from './role-row-actions'

export const rolesColumns: ColumnDef<Role>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Peran & Identitas' />
    ),
    cell: ({ row }) => {
      const role = row.original
      const isSystem = role.is_system

      return (
        <div className='flex items-center gap-3 py-1'>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-2xs ${
              isSystem
                ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
            }`}
          >
            {isSystem ? (
              <ShieldCheck className='h-4 w-4' />
            ) : (
              <KeyRound className='h-4 w-4' />
            )}
          </div>
          <div className='flex flex-col min-w-0 max-w-sm'>
            <span className='font-semibold text-sm text-foreground leading-tight truncate'>
              {role.name}
            </span>
            <span className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
              {role.description || 'Tidak ada deskripsi khusus.'}
            </span>
          </div>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'is_system',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Tipe Peran' />
    ),
    cell: ({ row }) => {
      const isSystem = row.getValue('is_system') as boolean
      return isSystem ? (
        <Badge
          variant='outline'
          className='w-fit text-xs px-2 py-0.5 font-medium border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
        >
          Sistem
        </Badge>
      ) : (
        <Badge
          variant='outline'
          className='w-fit text-xs px-2 py-0.5 font-medium border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
        >
          Kustom
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const isSystem = row.getValue(id) as boolean
      const stringVal = isSystem ? 'system' : 'custom'
      return value.includes(stringVal)
    },
    enableSorting: true,
  },
  {
    accessorKey: 'permissions_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Kewenangan Hak Akses' />
    ),
    cell: ({ row }) => {
      const role = row.original
      const count = role.permissions_count ?? role.permissions?.length ?? 0
      const preview = (role.permissions || []).slice(0, 2)

      return (
        <div className='flex flex-col gap-1 py-1 text-xs'>
          <div className='flex items-center gap-1.5'>
            <Badge variant='secondary' className='font-semibold text-[11px] px-2'>
              {count} Hak Akses
            </Badge>
          </div>
          {preview.length > 0 && (
            <div className='flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-xs'>
              <Shield className='h-3 w-3 shrink-0' />
              <span className='truncate font-mono'>
                {preview.map((p) => p.name).join(', ')}
                {count > 2 ? ` +${count - 2} lainnya` : ''}
              </span>
            </div>
          )}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'users_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Pengguna Ditugaskan' />
    ),
    cell: ({ row }) => {
      const count = (row.getValue('users_count') as number) ?? 0
      return (
        <div className='flex items-center gap-1.5 py-1 text-xs text-muted-foreground'>
          <UsersIcon className='h-3.5 w-3.5 text-foreground' />
          <span className='font-medium text-foreground'>{count}</span> Pegawai
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: RoleRowActions,
  },
]
