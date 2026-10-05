import { type ColumnDef } from '@tanstack/react-table'
import {
  Clock,
  Eye,
  Globe,
  Layers,
  User as UserIcon,
} from 'lucide-react'
import type { AuditLog } from '@/types/audit'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import { getActionBadgeConfig } from '../data/data'
import { useAuditLogs } from './audit-logs-provider'

function AuditActionCell({ log }: { log: AuditLog }) {
  const { setSelectedLog, setSheetOpen } = useAuditLogs()

  return (
    <Button
      variant='ghost'
      size='sm'
      className='h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground'
      onClick={() => {
        setSelectedLog(log)
        setSheetOpen(true)
      }}
    >
      <Eye className='h-3.5 w-3.5' />
      <span className='hidden xl:inline'>Detail</span>
    </Button>
  )
}

export const auditColumns: ColumnDef<AuditLog>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div className='flex items-center justify-center'>
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Pilih semua'
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className='flex items-center justify-center'>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Pilih baris'
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: 'w-10 text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Waktu & Tanggal' />
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue('created_at') as string
      const date = new Date(dateStr)
      return (
        <div className='flex items-center gap-2 py-1 text-xs'>
          <Clock className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
          <span className='font-mono text-muted-foreground whitespace-nowrap text-[11px]'>
            {date.toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'user_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Pelaksana / Pegawai' />
    ),
    cell: ({ row }) => {
      const log = row.original
      const name = log.user_name || 'Sistem Otomatis'
      const initials = name
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
          <div className='flex flex-col min-w-0 max-w-[200px]'>
            <span className='font-semibold text-sm text-foreground leading-tight truncate'>
              {name}
            </span>
            <span className='text-xs text-muted-foreground font-mono mt-0.5 truncate'>
              {log.user_nip ? `NIP. ${log.user_nip}` : log.user_email || 'Sistem'}
            </span>
          </div>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'module',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Modul' />
    ),
    cell: ({ row }) => {
      const module = row.getValue('module') as string
      let badgeClass = 'border-muted-foreground/30 bg-muted/40 text-foreground'

      if (module === 'Autentikasi') {
        badgeClass =
          'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
      } else if (module === 'Pegawai' || module === 'Profil') {
        badgeClass =
          'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
      } else if (module === 'Organisasi (OPD)') {
        badgeClass =
          'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300'
      } else if (module === 'Peran & Izin') {
        badgeClass =
          'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300'
      } else if (module === 'Master Data') {
        badgeClass =
          'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300'
      } else if (module === 'Pengaturan Sistem') {
        badgeClass =
          'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
      }

      return (
        <Badge variant='outline' className={`text-xs px-2 py-0.5 font-medium ${badgeClass}`}>
          {module}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: true,
  },
  {
    accessorKey: 'action',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Aksi' />
    ),
    cell: ({ row }) => {
      const action = row.getValue('action') as string
      const config = getActionBadgeConfig(action)

      return (
        <Badge
          variant='outline'
          className={`text-xs font-mono font-medium ${config.className}`}
        >
          {config.label}
        </Badge>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Deskripsi Aktivitas' />
    ),
    cell: ({ row }) => {
      const log = row.original
      const hasChanges = Boolean(
        log.context?.changes && Object.keys(log.context.changes).length > 0
      )

      return (
        <div className='flex flex-col gap-1 py-1 max-w-md'>
          <span className='text-xs font-medium text-foreground leading-normal'>
            {log.description}
          </span>
          {hasChanges && (
            <div className='flex items-center gap-1'>
              <Badge
                variant='secondary'
                className='text-[10px] font-normal px-1.5 py-0 bg-primary/10 text-primary'
              >
                <Layers className='h-2.5 w-2.5 mr-1' />
                {Object.keys(log.context!.changes!).length} Perubahan Kolom
              </Badge>
            </div>
          )}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'ip_address',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Alamat IP' />
    ),
    cell: ({ row }) => {
      const ip = row.getValue('ip_address') as string | null
      return (
        <div className='flex items-center gap-1.5 py-1 text-xs text-muted-foreground'>
          <Globe className='h-3 w-3 shrink-0' />
          <span className='font-mono text-[11px]'>{ip || '—'}</span>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <AuditActionCell log={row.original} />,
  },
]
