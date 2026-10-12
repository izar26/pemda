import { ColumnDef } from '@tanstack/react-table'
import {
  Building2,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layers,
} from 'lucide-react'
import type { SasaranPenilaianItem } from '@/types/perencanaan'
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
import { useSasaran } from './sasaran-provider'

interface CellProps {
  row: { original: SasaranPenilaianItem }
}

function SasaranRowActions({ row }: CellProps) {
  const { setOpen, setCurrentRow } = useSasaran()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('sasaran.edit')
  const canDelete = hasPermission('sasaran.delete')
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
              <span>Ubah Sasaran</span>
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
              <span>Hapus Sasaran</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const sasaranColumns: ColumnDef<SasaranPenilaianItem>[] = [
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
      className: 'w-64 min-w-[200px] max-w-[260px]',
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
    id: 'tujuan',
    accessorFn: (row) => row.tujuan?.tujuan || '',
    header: 'Tujuan Renstra Terkait',
    meta: {
      className: 'w-72 min-w-[240px] max-w-[320px]',
      tdClassName: 'whitespace-normal',
    },
    filterFn: (row, _id, value) => {
      if (!Array.isArray(value) || value.length === 0) return true
      return value.includes(row.original.tujuan_penilaian_id) || value.includes(row.original.tujuan?.tujuan)
    },
    cell: ({ row }) => {
      const tujuan = row.original.tujuan
      return (
        <div className='space-y-1 py-1'>
          {tujuan?.kode_tujuan && (
            <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-mono text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-300'>
              {tujuan.kode_tujuan}
            </Badge>
          )}
          <p className='text-xs text-muted-foreground leading-relaxed whitespace-normal break-words line-clamp-3'>
            {tujuan?.tujuan ?? 'Tujuan belum ditentukan'}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'sasaran',
    header: 'Pernyataan Sasaran Strategis (Renstra)',
    meta: {
      className: 'min-w-[320px]',
      tdClassName: 'whitespace-normal',
    },
    filterFn: (row, _id, value) => {
      const search = String(value || '').toLowerCase()
      const sasaranText = (row.original.sasaran || '').toLowerCase()
      const kodeText = (row.original.kode_sasaran || '').toLowerCase()
      const ketText = (row.original.keterangan || '').toLowerCase()
      const tujuanText = (row.original.tujuan?.tujuan || '').toLowerCase()
      return (
        sasaranText.includes(search) ||
        kodeText.includes(search) ||
        ketText.includes(search) ||
        tujuanText.includes(search)
      )
    },
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className='space-y-1.5 py-1 min-w-0 max-w-2xl'>
          <div className='flex items-center gap-2'>
            {item.kode_sasaran && (
              <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-mono text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-300'>
                {item.kode_sasaran}
              </Badge>
            )}
          </div>
          <p className='text-xs font-medium text-foreground leading-relaxed whitespace-normal break-words'>
            {item.sasaran}
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
    accessorKey: 'indikator_count',
    header: () => <div className='text-center'>Indikator Terhubung</div>,
    meta: {
      className: 'w-40 min-w-[140px] text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => {
      const count = row.original.indikator_count ?? 0
      return (
        <div className='flex justify-center'>
          <Badge
            variant='secondary'
            className='gap-1 text-xs font-normal'
          >
            <Layers className='h-3 w-3 text-muted-foreground' />
            <span>{count} Indikator</span>
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
    cell: SasaranRowActions,
  },
]
