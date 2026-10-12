import { ColumnDef } from '@tanstack/react-table'
import {
  Building2,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layers,
} from 'lucide-react'
import type { TujuanPenilaianItem } from '@/types/perencanaan'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermissions } from '@/hooks/use-permissions'
import { useTujuan } from './tujuan-provider'

interface CellProps {
  row: { original: TujuanPenilaianItem }
}

function TujuanRowActions({ row }: CellProps) {
  const { setOpen, setCurrentRow } = useTujuan()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('tujuan.edit')
  const canDelete = hasPermission('tujuan.delete')
  const item = row.original

  if (!canEdit && !canDelete) {
    return null
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='h-8 w-8 p-0'>
            <span className='sr-only'>Buka menu aksi</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44'>
          {canEdit && (
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(item)
                setOpen('edit')
              }}
              className='gap-2'
            >
              <Pencil className='h-4 w-4' />
              <span>Ubah Tujuan</span>
            </DropdownMenuItem>
          )}
          {canEdit && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(item)
                setOpen('delete')
              }}
              className='gap-2 text-destructive focus:text-destructive'
            >
              <Trash2 className='h-4 w-4' />
              <span>Hapus Tujuan</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const tujuanColumns: ColumnDef<TujuanPenilaianItem>[] = [
  {
    accessorKey: 'urutan',
    header: () => <div className='w-12 text-center'>No</div>,
    meta: {
      className: 'w-12 text-center',
      thClassName: 'w-12 text-center',
      tdClassName: 'w-12 text-center',
    },
    cell: ({ row }) => (
      <div className='w-12 text-center'>
        <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground'>
          {row.original.urutan}
        </span>
      </div>
    ),
  },
  {
    id: 'opd',
    accessorFn: (row) => row.opd?.nama || '',
    header: 'Perangkat Daerah (OPD)',
    meta: {
      className: 'w-72 min-w-[220px] max-w-[280px]',
      tdClassName: 'whitespace-normal',
    },
    filterFn: (row, _id, value) => {
      if (!Array.isArray(value) || value.length === 0) return true
      return value.includes(row.original.opd_id) || value.includes(row.original.opd?.nama)
    },
    cell: ({ row }) => {
      const opd = row.original.opd
      return (
        <div className='flex items-start gap-2.5 py-1'>
          <div className='mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
            <Building2 className='h-3.5 w-3.5' />
          </div>
          <div className='flex flex-col min-w-0'>
            <span className='font-semibold text-foreground text-xs leading-snug whitespace-normal break-words'>
              {opd?.nama ?? '-'}
            </span>
            {opd?.kode && (
              <span className='inline-block w-fit text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded mt-0.5'>
                {opd.kode}
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'tujuan',
    header: 'Pernyataan Tujuan Strategis (Renstra)',
    meta: {
      className: 'min-w-[340px]',
      tdClassName: 'whitespace-normal',
    },
    filterFn: (row, _id, value) => {
      const search = String(value || '').toLowerCase()
      const tujuanText = (row.original.tujuan || '').toLowerCase()
      const kodeText = (row.original.kode_tujuan || '').toLowerCase()
      const ketText = (row.original.keterangan || '').toLowerCase()
      return (
        tujuanText.includes(search) ||
        kodeText.includes(search) ||
        ketText.includes(search)
      )
    },
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className='space-y-1.5 py-1 min-w-0 max-w-2xl'>
          <div className='flex items-center gap-2'>
            {item.kode_tujuan && (
              <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-mono text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-300'>
                {item.kode_tujuan}
              </Badge>
            )}
          </div>
          <p className='text-xs font-medium text-foreground leading-relaxed whitespace-normal break-words'>
            {item.tujuan}
          </p>
          {item.keterangan && (
            <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground/80 italic'>
              <FileText className='h-3 w-3 shrink-0' />
              <span className='whitespace-normal break-words line-clamp-2'>{item.keterangan}</span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'sasaran_count',
    header: () => <div className='text-center'>Sasaran Terhubung</div>,
    meta: {
      className: 'w-40 min-w-[140px] text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => {
      const count = row.original.sasaran_count
      return (
        <div className='flex justify-center'>
          <Badge
            variant='secondary'
            className='gap-1 text-xs font-normal'
          >
            <Layers className='h-3 w-3 text-muted-foreground' />
            <span>{count} Sasaran</span>
          </Badge>
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Aksi</div>,
    meta: {
      className: 'w-16 min-w-[60px] text-right',
      thClassName: 'text-right',
      tdClassName: 'text-right',
    },
    cell: TujuanRowActions,
  },
]
