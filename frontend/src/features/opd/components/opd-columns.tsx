import { type ColumnDef } from '@tanstack/react-table'
import { Building2, Loader2, User, Users } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { OpdItem } from '@/types/opd'
import { opdService } from '@/services/opd-service'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { DataTableColumnHeader } from '@/components/data-table'
import { OpdRowActions } from './opd-row-actions'

function getCategoryBadgeClass(kategori: string): string {
  switch (kategori) {
    case 'Dinas':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Badan':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    case 'Sekretariat':
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700'
    case 'Inspektorat':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    case 'RSUD':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Kecamatan':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

// eslint-disable-next-line react-refresh/only-export-components
function OpdStatusSwitch({ opd }: { opd: OpdItem }) {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('opd.edit')

  const toggleMutation = useMutation({
    mutationFn: (id: string) => opdService.toggleActive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['opds'] })
      queryClient.invalidateQueries({ queryKey: ['opds-stats'] })
      toast.success(res.message)
    },
    onError: (err) => {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Gagal mengubah status aktif.'
      toast.error(msg)
    },
  })

  return (
    <div className='flex items-center justify-center gap-2'>
      <Switch
        checked={opd.is_active}
        disabled={!canEdit || toggleMutation.isPending}
        onCheckedChange={() => toggleMutation.mutate(opd.id)}
      />
      {toggleMutation.isPending && (
        <Loader2 className='h-3.5 w-3.5 animate-spin text-muted-foreground' />
      )}
    </div>
  )
}

export const opdColumns: ColumnDef<OpdItem>[] = [
  {
    accessorKey: 'urutan',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='No.' className='w-12 text-center' />
    ),
    meta: {
      className: 'w-12 text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => (
      <div className='text-center text-xs font-mono font-medium text-muted-foreground'>
        {row.getValue('urutan')}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'kode',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Kode' className='w-28' />
    ),
    meta: {
      className: 'w-28',
    },
    cell: ({ row }) => (
      <div className='font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-1 rounded w-fit'>
        {row.getValue('kode')}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'nama',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Nama Perangkat Daerah' />
    ),
    meta: {
      className: 'min-w-[280px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const opd = row.original
      return (
        <div className='flex items-start gap-3 py-1'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs mt-0.5'>
            <Building2 className='h-4 w-4' />
          </div>
          <div className='flex flex-col min-w-0 max-w-xl'>
            <span className='font-semibold text-sm text-foreground leading-snug whitespace-normal break-words'>
              {opd.nama}
            </span>
            <span className='text-xs text-muted-foreground mt-0.5 flex items-center gap-1 whitespace-normal break-words'>
              <User className='h-3 w-3 shrink-0 text-muted-foreground/70' />
              {opd.kepala ? `Kepala: ${opd.kepala}` : 'Kepala belum ditentukan'}
            </span>
          </div>
        </div>
      )
    },
    filterFn: (row, _id, value) => {
      const term = String(value || '').toLowerCase()
      const nama = String(row.original.nama || '').toLowerCase()
      const kode = String(row.original.kode || '').toLowerCase()
      const kepala = String(row.original.kepala || '').toLowerCase()
      return nama.includes(term) || kode.includes(term) || kepala.includes(term)
    },
    enableSorting: true,
  },
  {
    accessorKey: 'kategori',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Kategori' className='w-28 text-center' />
    ),
    meta: {
      className: 'w-28 text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => {
      const kategori = row.getValue('kategori') as string
      return (
        <Badge
          variant='outline'
          className={`text-xs px-2 py-0.5 font-medium ${getCategoryBadgeClass(kategori)}`}
        >
          {kategori}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: true,
  },
  {
    accessorKey: 'users_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Pegawai' className='w-24 text-center' />
    ),
    meta: {
      className: 'w-24 text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => {
      const count = (row.getValue('users_count') as number) || 0
      return (
        <div className='flex items-center justify-center gap-1.5'>
          <Badge
            variant='outline'
            className='bg-muted/50 border-muted text-xs font-mono font-medium gap-1 px-2 py-0.5'
          >
            <Users className='h-3 w-3 text-muted-foreground' />
            {count}
          </Badge>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status Aktif' className='w-28 text-center' />
    ),
    meta: {
      className: 'w-28 text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => <OpdStatusSwitch opd={row.original} />,
    filterFn: (row, id, value) => {
      const isActive = row.getValue(id) as boolean
      const activeString = isActive ? 'true' : 'false'
      return value.includes(activeString)
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <OpdRowActions row={row} />,
    meta: {
      className: 'w-14 text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
  },
]
