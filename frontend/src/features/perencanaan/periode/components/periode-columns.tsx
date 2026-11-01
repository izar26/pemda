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
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
  table?: any
}

function PeriodeRowActions({ row, table }: CellProps) {
  const { setOpen, setCurrentRow, activeWithRisk: ctxActiveWithRisk } = usePeriode()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('periode.edit')
  const canDelete = hasPermission('periode.delete')
  const item = row.original

  const allItems = (table?.options?.data as PeriodePenilaianItem[]) || []
  const tableActiveWithRisk = allItems.find(
    (p) => p.is_aktif && Boolean(p.has_risiko_transactions ?? p.has_transactions)
  )
  const activeWithRisk = ctxActiveWithRisk || tableActiveWithRisk || null
  const isBlockedByOtherActiveCycle =
    !item.is_aktif && Boolean(activeWithRisk && activeWithRisk.id !== item.id)

  if (!canEdit && !canDelete) {
    return null
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      {canEdit && !item.is_aktif && item.status !== 'arsip' && (
        <Button
          variant='outline'
          size='sm'
          disabled={isBlockedByOtherActiveCycle}
          title={
            isBlockedByOtherActiveCycle
              ? `Terkunci: Siklus ${activeWithRisk?.nama_periode} (${activeWithRisk?.tahun_penilaian}) sedang berjalan aktif dengan data transaksi risiko OPD.`
              : 'Aktifkan Periode'
          }
          className={cn(
            'h-8 gap-1.5',
            isBlockedByOtherActiveCycle
              ? 'border-muted text-muted-foreground/60 opacity-60 cursor-not-allowed'
              : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400'
          )}
          onClick={() => {
            if (isBlockedByOtherActiveCycle) return
            setCurrentRow(item)
            setOpen('activate')
          }}
        >
          {isBlockedByOtherActiveCycle ? (
            <Lock className='h-3.5 w-3.5' />
          ) : (
            <Power className='h-3.5 w-3.5' />
          )}
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
              disabled={isBlockedByOtherActiveCycle}
              onClick={() => {
                if (isBlockedByOtherActiveCycle) return
                setCurrentRow(item)
                setOpen('activate')
              }}
              className={cn(
                'gap-2',
                isBlockedByOtherActiveCycle
                  ? 'opacity-60 cursor-not-allowed'
                  : 'text-emerald-600 focus:text-emerald-600 dark:text-emerald-400'
              )}
            >
              {isBlockedByOtherActiveCycle ? (
                <Lock className='h-4 w-4' />
              ) : (
                <Power className='h-4 w-4' />
              )}
              <span>Jadikan Periode Aktif</span>
              {isBlockedByOtherActiveCycle && (
                <span className='text-[10px] text-muted-foreground ml-auto'>(Terkunci)</span>
              )}
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
              disabled={
                item.is_aktif ||
                Boolean(
                  item.transaction_counts?.has_any_data ??
                  item.has_risiko_transactions ??
                  item.has_transactions
                )
              }
              className='gap-2 text-destructive focus:text-destructive'
            >
              <Trash2 className='h-4 w-4' />
              <span>Hapus Periode</span>
              {Boolean(
                item.transaction_counts?.has_any_data ??
                item.has_risiko_transactions ??
                item.has_transactions
              ) && (
                <Lock className='h-3.5 w-3.5 ml-auto text-muted-foreground' />
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function YearPillsSelector({
  item,
  activeWithRisk: propActiveWithRisk,
}: {
  item: PeriodePenilaianItem
  activeWithRisk?: PeriodePenilaianItem | null
}) {
  const { setOpen, setCurrentRow, setTargetYear, activeWithRisk: ctxActiveWithRisk } = usePeriode()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('periode.edit')
  const activeWithRisk = propActiveWithRisk ?? ctxActiveWithRisk ?? null

  const isBlockedByOtherActiveCycle =
    !item.is_aktif && Boolean(activeWithRisk && activeWithRisk.id !== item.id)

  const isSelfLocked = Boolean(item.has_risiko_transactions ?? item.has_transactions)
  const selfRiskCount = item.risiko_transactions_count ?? item.total_transactions ?? 0
  const activeRiskCount = activeWithRisk?.risiko_transactions_count ?? activeWithRisk?.total_transactions ?? 0

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

    if (isBlockedByOtherActiveCycle && activeWithRisk) {
      toast.warning(
        `Tidak dapat beralih ke periode '${item.nama_periode}'. Siklus '${activeWithRisk.nama_periode}' (Tahun ${activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan ${activeRiskCount} data pengisian Pengelolaan Risiko OPD. Selama siklus aktif memiliki transaksi risiko berjalan, perpindahan ke siklus RPJMD lain diblokir demi integritas data.`
      )
      return
    }

    if (year !== item.tahun_penilaian && isSelfLocked) {
      toast.warning(
        `Tahun Penilaian ${item.tahun_penilaian} tidak dapat diubah ke tahun ${year} karena sudah ada ${selfRiskCount} data pengisian Pengelolaan Risiko OPD. Tahun penilaian telah dikunci demi integritas data dan jejak audit.`
      )
      return
    }

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
          const isPillLocked =
            isBlockedByOtherActiveCycle || (isSelfLocked && !isSelected)
          const isDisabled = (!canEdit && !isCurrentActive) || isPillLocked

          return (
            <button
              key={yr}
              type='button'
              onClick={() => handleSelectYear(yr)}
              disabled={isDisabled}
              title={
                isBlockedByOtherActiveCycle && activeWithRisk
                  ? `Terkunci: Siklus ${activeWithRisk.nama_periode} (Tahun ${activeWithRisk.tahun_penilaian}) sedang berjalan aktif dengan data transaksi risiko OPD.`
                  : isSelfLocked && !isSelected
                  ? `Terkunci: Tahun ${item.tahun_penilaian} sudah memiliki ${selfRiskCount} data risiko OPD. Tahun penilaian tidak dapat diubah ke ${yr}.`
                  : isCurrentActive
                  ? `Tahun ${yr} (Sedang Aktif Berjalan)`
                  : isSelected
                  ? `Klik untuk mengaktifkan siklus di Tahun ${yr}`
                  : canEdit
                  ? `Klik untuk beralih ke Tahun ${yr}`
                  : `Tahun ${yr}`
              }
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150',
                isDisabled
                  ? 'cursor-not-allowed opacity-60'
                  : canEdit
                  ? 'cursor-pointer'
                  : 'cursor-default',
                isCurrentActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 ring-2 ring-emerald-600/40 font-bold'
                  : isSelected
                  ? 'bg-secondary text-foreground border border-secondary-foreground/20 hover:bg-secondary/80'
                  : isPillLocked
                  ? 'bg-muted/40 text-muted-foreground/60 border border-transparent'
                  : 'bg-muted/70 text-muted-foreground border border-transparent hover:border-emerald-500/40 hover:text-foreground hover:bg-emerald-500/10'
              )}
            >
              {isCurrentActive && (
                <span className='h-1.5 w-1.5 rounded-full bg-white animate-pulse' />
              )}
              {yr}
              {isPillLocked && (
                <Lock className='h-2.5 w-2.5 text-muted-foreground/60' />
              )}
            </button>
          )
        })}
      </div>
      <div className='text-[11px] text-muted-foreground'>
        {item.is_aktif ? (
          <span
            className={cn(
              'font-medium flex items-center gap-1',
              isSelfLocked
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {isSelfLocked ? (
              <>
                <Lock className='h-3 w-3 shrink-0' />
                <span>
                  Tahun Aktif: <strong>{item.tahun_penilaian}</strong> (Terkunci: Ada {selfRiskCount} pengisian Pengelolaan Risiko OPD)
                </span>
              </>
            ) : (
              <>
                <span>●</span> Tahun Aktif: <strong>{item.tahun_penilaian}</strong> (Bebas beralih tahun - belum ada pengisian risiko)
              </>
            )}
          </span>
        ) : isBlockedByOtherActiveCycle && activeWithRisk ? (
          <span className='font-medium text-amber-600/90 dark:text-amber-400/90 flex items-center gap-1'>
            <Lock className='h-3 w-3 shrink-0' />
            <span>
              Terkunci: Siklus aktif {activeWithRisk.nama_periode} ({activeWithRisk.tahun_penilaian}) memiliki data risiko berjalan
            </span>
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
    cell: ({ row, table }) => {
      const allData = (table?.options?.data as PeriodePenilaianItem[]) || []
      const activeWithRisk = allData.find(
        (p) => p.is_aktif && Boolean(p.has_risiko_transactions ?? p.has_transactions)
      ) || null
      return <YearPillsSelector item={row.original} activeWithRisk={activeWithRisk} />
    },
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
