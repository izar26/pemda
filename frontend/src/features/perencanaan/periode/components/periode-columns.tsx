import type { ColumnDef } from '@tanstack/react-table'
import {
  CalendarDays,
  Clock,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
  CheckCircle2,
  Archive,
} from 'lucide-react'
import type { PeriodePenilaianItem } from '@/types/perencanaan'
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
import { usePeriode } from './periode-provider'

interface CellProps {
  row: { original: PeriodePenilaianItem }
}

function PeriodeRowActions({ row }: CellProps) {
  const { setOpen, setCurrentRow } = usePeriode()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('periode.edit')
  const canDelete = hasPermission('periode.delete')
  const item = row.original

  if (!canEdit && !canDelete) {
    return null
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      {canEdit && !item.is_aktif && item.status !== 'arsip' && (
        <Button
          variant='outline'
          size='sm'
          className='h-8 gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400'
          onClick={() => {
            setCurrentRow(item)
            setOpen('activate')
          }}
        >
          <Power className='h-3.5 w-3.5' />
          <span>Aktifkan</span>
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='h-8 w-8 p-0'>
            <span className='sr-only'>Buka menu aksi</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          {canEdit && !item.is_aktif && item.status !== 'arsip' && (
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(item)
                setOpen('activate')
              }}
              className='gap-2 text-emerald-600 focus:text-emerald-600 dark:text-emerald-400'
            >
              <Power className='h-4 w-4' />
              <span>Jadikan Periode Aktif</span>
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(item)
                setOpen('edit')
              }}
              className='gap-2'
            >
              <Pencil className='h-4 w-4' />
              <span>Ubah Periode</span>
            </DropdownMenuItem>
          )}
          {canEdit && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(item)
                setOpen('delete')
              }}
              disabled={item.is_aktif}
              className='gap-2 text-destructive focus:text-destructive'
            >
              <Trash2 className='h-4 w-4' />
              <span>Hapus Periode</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function YearPillsSelector({ item }: { item: PeriodePenilaianItem }) {
  const { setOpen, setCurrentRow, setTargetYear } = usePeriode()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('periode.edit')
  const years: number[] =
    item.daftar_tahun && item.daftar_tahun.length > 0
      ? item.daftar_tahun
      : Array.from(
          { length: item.tahun_akhir - item.tahun_mulai + 1 },
          (_, i) => item.tahun_mulai + i
        )

  const handleSelectYear = (year: number) => {
    if (!canEdit) return
    if (year === item.tahun_penilaian && item.is_aktif) return
    setCurrentRow(item)
    setTargetYear(year)
    setOpen('switch-year')
  }

  return (
    <div className='flex flex-col gap-1.5 py-0.5'>
      <div className='flex items-center gap-1.5 flex-wrap'>
        {years.map((yr) => {
          const isSelected = yr === item.tahun_penilaian
          const isCurrentActive = isSelected && item.is_aktif

          return (
            <button
              key={yr}
              type='button'
              onClick={() => handleSelectYear(yr)}
              disabled={!canEdit && !isCurrentActive}
              title={
                isCurrentActive
                  ? `Tahun ${yr} (Sedang Berjalan)`
                  : canEdit
                  ? `Klik untuk beralih ke Tahun ${yr}`
                  : `Tahun ${yr}`
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                canEdit ? 'cursor-pointer' : 'cursor-default'
              } ${
                isCurrentActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 ring-2 ring-emerald-600/40 font-bold'
                  : isSelected
                  ? 'bg-secondary text-foreground border border-secondary-foreground/20 hover:bg-secondary/80'
                  : 'bg-muted/70 text-muted-foreground border border-transparent hover:border-emerald-500/40 hover:text-foreground hover:bg-emerald-500/10'
              }`}
            >
              {isCurrentActive && (
                <span className='h-1.5 w-1.5 rounded-full bg-white animate-pulse' />
              )}
              {yr}
            </button>
          )
        })}
      </div>
      <div className='text-[11px] text-muted-foreground'>
        {item.is_aktif ? (
          <span className='text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1'>
            <span>●</span> Tahun Aktif: <strong>{item.tahun_penilaian}</strong> (Klik tahun lain untuk pindah)
          </span>
        ) : (
          <span>Klik tahun untuk mengaktifkan siklus</span>
        )}
      </div>
    </div>
  )
}

export const periodeColumns: ColumnDef<PeriodePenilaianItem>[] = [
  {
    accessorKey: 'nama_periode',
    header: 'Siklus RPJMD',
    meta: {
      className: 'min-w-[240px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className='py-1 min-w-0'>
          <div className='font-semibold text-foreground text-sm leading-snug whitespace-normal break-words'>
            {item.nama_periode}
          </div>
          {item.keterangan ? (
            <div className='text-xs text-muted-foreground mt-0.5 whitespace-normal break-words line-clamp-2'>
              {item.keterangan}
            </div>
          ) : (
            <div className='text-xs text-muted-foreground/60 mt-0.5'>Tanpa catatan kebijakan</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'tahun_penilaian',
    header: 'Tahun Penilaian (Pilih Tahun Aktif)',
    meta: {
      className: 'min-w-[280px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => <YearPillsSelector item={row.original} />,
  },
  {
    id: 'rentang_tanggal',
    header: 'Periode Pelaksanaan',
    meta: {
      className: 'w-48 min-w-[180px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const item = row.original
      const formatDate = (d: string) => {
        try {
          const [year, month, day] = d.split('-')
          const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
          ]
          return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`
        } catch {
          return d
        }
      }

      return (
        <div className='flex items-center gap-2 text-xs'>
          <CalendarDays className='h-4 w-4 text-muted-foreground shrink-0' />
          <span className='font-mono text-[11px] text-muted-foreground'>
            {formatDate(item.tanggal_mulai)} s/d {formatDate(item.tanggal_akhir)}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'sisa_hari',
    header: () => <div className='text-center'>Sisa Waktu</div>,
    meta: {
      className: 'w-36 min-w-[130px] text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => {
      const item = row.original
      if (!item.is_aktif || item.sisa_hari === null) {
        return <div className='text-xs text-muted-foreground text-center'>-</div>
      }

      if (item.sisa_hari < 0) {
        return (
          <div className='flex justify-center'>
            <Badge variant='outline' className='gap-1 border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'>
              <Clock className='h-3 w-3' />
              <span>Lewat {Math.abs(item.sisa_hari)} hari</span>
            </Badge>
          </div>
        )
      }

      if (item.sisa_hari <= 30) {
        return (
          <div className='flex justify-center'>
            <Badge variant='outline' className='gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'>
              <Clock className='h-3 w-3' />
              <span>{item.sisa_hari} hari lagi</span>
            </Badge>
          </div>
        )
      }

      return (
        <div className='flex justify-center'>
          <Badge variant='outline' className='gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'>
            <Clock className='h-3 w-3' />
            <span>{item.sisa_hari} hari lagi</span>
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: () => <div className='text-center'>Status</div>,
    meta: {
      className: 'w-36 min-w-[130px] text-center',
      thClassName: 'text-center',
      tdClassName: 'text-center',
    },
    cell: ({ row }) => {
      const item = row.original

      return (
        <div className='flex justify-center'>
          {item.is_aktif ? (
            <Badge className='bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 gap-1.5 py-1 px-2.5 font-medium'>
              <CheckCircle2 className='h-3.5 w-3.5' />
              <span>Aktif (Berjalan)</span>
            </Badge>
          ) : item.status === 'arsip' ? (
            <Badge variant='secondary' className='gap-1 py-1 px-2.5 text-muted-foreground'>
              <Archive className='h-3.5 w-3.5' />
              <span>Arsip</span>
            </Badge>
          ) : (
            <Badge variant='outline' className='py-1 px-2.5 text-muted-foreground'>
              <span>Tidak Aktif</span>
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Aksi</div>,
    meta: {
      className: 'w-36 min-w-[120px] text-right',
      thClassName: 'text-right',
      tdClassName: 'text-right',
    },
    cell: PeriodeRowActions,
  },
]
