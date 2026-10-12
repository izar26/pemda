import { ColumnDef } from '@tanstack/react-table'
import {
  Building2,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sparkles,
  Layers,
} from 'lucide-react'
import type { IndikatorPenilaianItem } from '@/types/perencanaan'
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
import { useIku } from './iku-provider'

interface CellProps {
  row: { original: IndikatorPenilaianItem }
}

function IkuRowActions({ row }: CellProps) {
  const { setOpen, setCurrentRow } = useIku()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('iku.edit')
  const canDelete = hasPermission('iku.delete')
  const item = row.original

  if (!canEdit && !canDelete) {
    return null
  }

  const label = item.jenis === 'IKU' ? 'IKU' : 'Indikator'

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
              <span>Ubah {label}</span>
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
              <span>Hapus {label}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const ikuColumns: ColumnDef<IndikatorPenilaianItem>[] = [
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
      className: 'w-60 min-w-[190px] max-w-[240px]',
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
    accessorKey: 'jenis',
    header: () => <div className='w-28 text-center'>Jenis</div>,
    meta: {
      className: 'w-28 min-w-[100px] text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    filterFn: (row, _id, value) => {
      if (!value || value === 'all') return true
      return row.original.jenis === value
    },
    cell: ({ row }) => {
      const isIku = row.original.jenis === 'IKU'
      return (
        <div className='flex justify-center'>
          {isIku ? (
            <Badge
              variant='outline'
              className='gap-1 font-semibold text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:border-amber-500/40'
            >
              <Sparkles className='h-3 w-3 text-amber-500' />
              <span>IKU</span>
            </Badge>
          ) : (
            <Badge
              variant='secondary'
              className='text-[11px] font-normal text-muted-foreground'
            >
              Indikator Renstra
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'sasaran',
    accessorFn: (row) => row.sasaran?.sasaran || '',
    header: 'Sasaran & Tujuan Terkait',
    meta: {
      className: 'w-72 min-w-[240px] max-w-[320px]',
      tdClassName: 'whitespace-normal',
    },
    filterFn: (row, _id, value) => {
      if (!Array.isArray(value) || value.length === 0) return true
      return value.includes(row.original.sasaran_penilaian_id) || value.includes(row.original.sasaran?.sasaran)
    },
    cell: ({ row }) => {
      const sasaran = row.original.sasaran
      const tujuan = row.original.tujuan
      return (
        <div className='space-y-1.5 py-1'>
          <div className='flex items-center gap-1.5'>
            {sasaran?.kode_sasaran && (
              <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-mono text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-300'>
                {sasaran.kode_sasaran}
              </Badge>
            )}
            <span className='text-[11px] font-semibold text-foreground leading-snug line-clamp-2 whitespace-normal break-words'>
              {sasaran?.sasaran ?? 'Sasaran belum ditentukan'}
            </span>
          </div>
          {tujuan && (
            <div className='flex items-center gap-1 text-[10px] text-muted-foreground leading-tight'>
              <Layers className='h-3 w-3 shrink-0 text-muted-foreground/60' />
              <span className='line-clamp-1 italic'>
                Tujuan: {tujuan.kode_tujuan ? `[${tujuan.kode_tujuan}] ` : ''}{tujuan.tujuan}
              </span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'indikator',
    header: 'Pernyataan Indikator / IKU Renstra',
    meta: {
      className: 'min-w-[320px]',
      tdClassName: 'whitespace-normal',
    },
    filterFn: (row, _id, value) => {
      const search = String(value || '').toLowerCase()
      const indText = (row.original.indikator || '').toLowerCase()
      const kodeText = (row.original.kode_indikator || '').toLowerCase()
      const ketText = (row.original.keterangan || '').toLowerCase()
      return (
        indText.includes(search) ||
        kodeText.includes(search) ||
        ketText.includes(search)
      )
    },
    cell: ({ row }) => {
      const item = row.original
      const isIku = item.jenis === 'IKU'
      return (
        <div className='space-y-1.5 py-1 min-w-0 max-w-2xl'>
          <div className='flex items-center gap-2 flex-wrap'>
            {item.kode_indikator && (
              <Badge
                variant='outline'
                className={`text-[10px] px-1.5 py-0 font-mono ${
                  isIku
                    ? 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-300'
                    : 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-300'
                }`}
              >
                {item.kode_indikator}
              </Badge>
            )}
          </div>
          <p className='text-xs font-medium text-foreground leading-relaxed whitespace-normal break-words'>
            {item.indikator}
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
    id: 'actions',
    header: () => <div className='text-right'>Aksi</div>,
    meta: {
      className: 'w-16 min-w-[60px] text-right',
      thClassName: 'text-right',
      tdClassName: 'text-right',
    },
    cell: IkuRowActions,
  },
]
