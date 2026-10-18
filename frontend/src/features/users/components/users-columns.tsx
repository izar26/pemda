import { type ColumnDef } from '@tanstack/react-table'
import {
  Award,
  Building2,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
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
    meta: {
      className: 'min-w-[220px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const user = row.original
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

      return (
        <div className='flex items-center gap-3 py-1 min-w-0'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary'>
            {initials || <UserIcon className='h-4 w-4' />}
          </div>
          <div className='flex flex-col min-w-0'>
            <span className='font-semibold text-sm text-foreground leading-snug whitespace-normal break-words'>
              {user.name}
            </span>
            <span className='text-xs text-muted-foreground font-mono mt-0.5 whitespace-nowrap'>
              {user.nip ? `NIP. ${user.nip}` : 'NIP belum diisi'}
            </span>
          </div>
        </div>
      )
    },
    filterFn: (row, _id, value) => {
      const searchStr = String(value || '').toLowerCase()
      const name = (row.original.name || '').toLowerCase()
      const nip = (row.original.nip || '').toLowerCase()
      return name.includes(searchStr) || nip.includes(searchStr)
    },
    enableSorting: true,
  },
  {
    id: 'jabatan_pangkat',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Jabatan & Golongan' />
    ),
    meta: {
      className: 'w-52 min-w-[170px] max-w-[230px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const user = row.original
      const isKepala = user.jabatan === 'Kepala OPD'
      return (
        <div className='flex flex-col py-1 text-xs gap-1 min-w-0'>
          <div className='flex items-center gap-1'>
            {isKepala ? (
              <Badge
                variant='outline'
                className='w-fit text-[11px] font-semibold px-2 py-0 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1'
              >
                <Award className='h-3 w-3 shrink-0' />
                Kepala OPD
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='w-fit text-[11px] font-medium px-2 py-0 border-border bg-muted/40 text-foreground'
              >
                Pegawai
              </Badge>
            )}
          </div>
          {user.pangkat_gol ? (
            <span className='text-[11px] text-muted-foreground'>
              {user.pangkat_gol}
            </span>
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
    meta: {
      className: 'w-72 min-w-[240px] max-w-[300px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const opd = row.original.opd
      return (
        <div className='flex flex-col py-1 text-xs gap-1 min-w-0'>
          <div className='flex items-start gap-1.5'>
            <Building2 className='h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5' />
            <span className='font-medium text-foreground leading-snug whitespace-normal break-words'>
              {opd ? (
                opd.nama
              ) : (
                <span className='text-muted-foreground italic'>
                  Belum Ditugaskan
                </span>
              )}
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
    meta: {
      className: 'min-w-[190px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className='flex flex-col py-1 text-xs min-w-0'>
          <span className='font-medium text-foreground break-all'>
            {user.email}
          </span>
          <span className='text-muted-foreground mt-0.5 font-mono text-[11px]'>
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
    meta: {
      className: 'w-36 min-w-[130px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const roleName = (row.getValue('role') as string) || '-'
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
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title='Status Akun'
        className='justify-center'
      />
    ),
    meta: {
      className: 'w-28 min-w-[110px] text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => {
      const status = row.original.status || 'inactive'
      const config = statusBadgeMap.get(status) || {
        label: status === 'active' ? 'Aktif' : 'Nonaktif',
        className: 'bg-muted text-muted-foreground',
      }

      return (
        <div className='flex justify-center'>
          <Badge
            variant='outline'
            className={`text-xs font-medium capitalize ${config.className}`}
          >
            {config.label}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Aksi</div>,
    meta: {
      className: 'w-16 min-w-[60px] text-right',
      thClassName: 'text-right',
      tdClassName: 'text-right',
    },
    cell: ({ row }) => (
      <div className='flex items-center justify-end'>
        <DataTableRowActions row={row} />
      </div>
    ),
  },
]
