import { type ColumnDef } from '@tanstack/react-table'
import { ShieldAlert, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { statusBadgeMap } from '../data/data'
import { type User } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const usersColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Pegawai' />
    ),
    cell: ({ row }) => {
      const user = row.original
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

      return (
        <div className='flex items-center gap-3 py-1'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary'>
            {initials || <UserIcon className='h-4 w-4' />}
          </div>
          <div className='flex flex-col'>
            <span className='font-semibold text-sm text-foreground leading-tight'>
              {user.name}
            </span>
            <span className='text-xs text-muted-foreground font-mono mt-0.5'>
              {user.nip ? `NIP. ${user.nip}` : 'NIP belum diisi'}
            </span>
          </div>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Email & Kontak' />
    ),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className='flex flex-col py-1 text-xs'>
          <span className='font-medium text-foreground'>{user.email}</span>
          <span className='text-muted-foreground mt-0.5'>
            {user.phone ? user.phone : '-'}
          </span>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Peran (Role)' />
    ),
    cell: ({ row }) => {
      const roleName = row.getValue('role') as string
      const isSuper = roleName === 'Superadmin'

      return (
        <div className='flex items-center gap-1.5'>
          <Badge
            variant='outline'
            className={`text-xs px-2 py-0.5 font-medium ${
              isSuper
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                : 'border-muted-foreground/30 bg-muted/40 text-foreground'
            }`}
          >
            {roleName}
          </Badge>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'two_factor_enabled',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Keamanan (2FA)' />
    ),
    cell: ({ row }) => {
      const is2fa = Boolean(row.getValue('two_factor_enabled'))

      return (
        <div className='flex items-center gap-1.5'>
          {is2fa ? (
            <Badge
              variant='outline'
              className='text-[11px] font-normal border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 gap-1'
            >
              <ShieldCheck className='h-3 w-3' />
              2FA Aktif
            </Badge>
          ) : (
            <Badge
              variant='outline'
              className='text-[11px] font-normal text-muted-foreground border-dashed gap-1'
            >
              <ShieldAlert className='h-3 w-3' />
              Belum Aktif
            </Badge>
          )}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.original.status
      const config = statusBadgeMap.get(status) || {
        label: status,
        className: 'bg-muted text-muted-foreground',
      }

      return (
        <Badge variant='outline' className={`text-xs font-medium capitalize ${config.className}`}>
          {config.label}
        </Badge>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Terdaftar' />
    ),
    cell: ({ row }) => {
      const createdAt = row.original.created_at
      if (!createdAt) return <span className='text-xs text-muted-foreground'>-</span>

      const dateStr = new Date(createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

      return <span className='text-xs text-muted-foreground'>{dateStr}</span>
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: DataTableRowActions,
  },
]
