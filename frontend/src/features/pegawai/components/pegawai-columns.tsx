import { type ColumnDef } from '@tanstack/react-table'
import { Award, Building2, Phone, User as UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { type User } from '@/features/users/data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const pegawaiColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Pegawai' />
    ),
    meta: {
      className: 'min-w-[230px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const pegawai = row.original
      const initials = pegawai.name
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
              {pegawai.name}
            </span>
            <span className='text-xs text-muted-foreground font-mono mt-0.5 whitespace-nowrap'>
              {pegawai.nip ? `NIP. ${pegawai.nip}` : 'NIP belum diisi'}
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
    id: 'jabatan',
    accessorFn: (row) => row.jabatan || 'Pegawai',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Jabatan & Golongan' />
    ),
    meta: {
      className: 'w-56 min-w-[180px] max-w-[240px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const pegawai = row.original
      const isKepala = pegawai.jabatan === 'Kepala OPD'

      return (
        <div className='flex flex-col py-1 text-xs gap-1.5 min-w-0'>
          <div className='flex items-center gap-1.5'>
            {isKepala ? (
              <Badge
                variant='outline'
                className='w-fit text-[11px] font-semibold px-2 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1'
              >
                <Award className='h-3 w-3 shrink-0' />
                Kepala OPD
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='w-fit text-[11px] font-medium px-2 py-0.5 border-border bg-muted/40 text-foreground'
              >
                Pegawai
              </Badge>
            )}
          </div>
          {pegawai.pangkat_gol ? (
            <span className='text-[11px] text-muted-foreground leading-snug'>
              {pegawai.pangkat_gol}
            </span>
          ) : (
            <span className='text-[11px] text-muted-foreground'>-</span>
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
    id: 'opd',
    accessorFn: (row) => row.opd?.nama || 'Belum Ditugaskan',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Instansi / OPD' />
    ),
    meta: {
      className: 'w-72 min-w-[240px] max-w-[320px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const opd = row.original.opd
      return (
        <div className='flex flex-col py-1 text-xs gap-1 min-w-0'>
          <div className='flex items-start gap-1.5'>
            <Building2 className='h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5' />
            <span className='font-medium text-foreground leading-snug whitespace-normal break-words'>
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
      <DataTableColumnHeader column={column} title='Kontak & WhatsApp' />
    ),
    meta: {
      className: 'min-w-[200px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const pegawai = row.original
      return (
        <div className='flex flex-col py-1 text-xs min-w-0 gap-0.5'>
          <span className='font-medium text-foreground break-all'>{pegawai.email}</span>
          <span className='inline-flex items-center gap-1 text-muted-foreground font-mono text-[11px]'>
            <Phone className='h-3 w-3 shrink-0' />
            {pegawai.phone ? pegawai.phone : '-'}
          </span>
        </div>
      )
    },
    enableSorting: true,
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
