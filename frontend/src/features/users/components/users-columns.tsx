import { type ColumnDef } from '@tanstack/react-table'
import { Building2, ShieldAlert, ShieldCheck, User as UserIcon } from 'lucide-react'
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
          <div className='flex flex-col min-w-0'>
            <span className='font-semibold text-sm text-foreground leading-tight truncate'>
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
    id: 'jabatan_pangkat',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Jabatan & Golongan' />
    ),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className='flex flex-col py-1 text-xs gap-1 max-w-[220px]'>
          <span className='font-medium text-foreground leading-tight'>
            {user.jabatan || <span className='text-muted-foreground italic'>Belum diatur</span>}
          </span>
          {user.pangkat_gol ? (
            <Badge variant='secondary' className='w-fit text-[11px] font-normal px-1.5 py-0'>
              {user.pangkat_gol}
            </Badge>
          ) : (
            <span className='text-[11px] text-muted-foreground'>-</span>
          )}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    id: 'opd',
    accessorFn: (row) => row.opd?.nama || 'Belum Ditugaskan',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Instansi / OPD' />
    ),
    cell: ({ row }) => {
      const opd = row.original.opd
      return (
        <div className='flex flex-col py-1 text-xs gap-1 max-w-[240px]'>
          <div className='flex items-start gap-1.5'>
            <Building2 className='h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5' />
            <span className='font-medium text-foreground leading-tight'>
              {opd ? opd.nama : <span className='text-muted-foreground italic'>Belum Ditugaskan</span>}
            </span>
          </div>
          {opd?.kategori && (
            <span className='text-[10px] text-muted-foreground uppercase tracking-wider pl-5'>
              {opd.kategori}
            </span>
          )}
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Kontak' />
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
      <DataTableColumnHeader column={column} title='Peran & 2FA' />
    ),
    cell: ({ row }) => {
      const roleName = row.getValue('role') as string
      const isSuper = roleName === 'Superadmin'
      const is2fa = Boolean(row.original.two_factor_enabled)

      return (
        <div className='flex flex-col gap-1.5 py-1'>
          <Badge
            variant='outline'
            className={`w-fit text-xs px-2 py-0.5 font-medium ${
              isSuper
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                : 'border-muted-foreground/30 bg-muted/40 text-foreground'
            }`}
          >
            {roleName}
          </Badge>
          <div className='flex items-center gap-1'>
            {is2fa ? (
              <span className='inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium'>
                <ShieldCheck className='h-3 w-3' />
                2FA Aktif
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground'>
                <ShieldAlert className='h-3 w-3' />
                2FA Nonaktif
              </span>
            )}
          </div>
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
    id: 'actions',
    cell: DataTableRowActions,
  },
]
