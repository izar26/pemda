import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CalendarDays,
  CalendarCheck,
  AlertTriangle,
  ExternalLink,
  Info,
  Clock,
  CalendarRange,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { perencanaanService } from '@/services/perencanaan-service'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function TahunPenilaianBadge() {
  const [open, setOpen] = useState(false)
  const { hasPermission } = usePermissions()
  const canManagePeriode = hasPermission('periode.view') || hasPermission('periode.edit')

  const { data: activePeriode, isLoading } = useQuery({
    queryKey: ['perencanaan', 'periode', 'active'],
    queryFn: () => perencanaanService.getActivePeriode(),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className='flex h-8 items-center gap-1.5 px-2.5 rounded-md bg-muted/20 border border-border/30 animate-pulse text-xs text-muted-foreground shrink-0 select-none'>
        <CalendarDays className='h-3.5 w-3.5 opacity-50 shrink-0' />
        <span className='w-20 h-3 bg-muted/60 rounded'></span>
      </div>
    )
  }

  // Case 1: No active evaluation period
  if (!activePeriode) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            className='group inline-flex h-8 items-center gap-1.5 sm:gap-2 px-2.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer select-none whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring shrink-0'
          >
            <AlertTriangle className='h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0' />
            <span className='hidden sm:inline font-sans whitespace-nowrap'>Tahun Penilaian: Belum Ditetapkan</span>
            <span className='inline sm:hidden font-sans whitespace-nowrap'>T.A. Belum Aktif</span>
            <ChevronDown className='h-3 w-3 text-amber-600/70 dark:text-amber-400/70 transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0' />
          </button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-80 p-4 space-y-3'>
          <div className='flex items-start gap-2.5 text-amber-700 dark:text-amber-400'>
            <AlertTriangle className='h-5 w-5 shrink-0 mt-0.5' />
            <div>
              <h4 className='font-semibold text-sm text-foreground'>
                Belum Ada Tahun Penilaian Aktif
              </h4>
              <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                Saat ini belum ada periode penilaian yang diaktifkan oleh Administrator atau Bapperida. Modul perencanaan risiko dan evaluasi membutuhkan tahun penilaian aktif.
              </p>
            </div>
          </div>

          {canManagePeriode && (
            <>
              <Separator />
              <div className='pt-1'>
                <Button
                  asChild
                  size='sm'
                  className='w-full text-xs h-8 gap-1.5'
                  onClick={() => setOpen(false)}
                >
                  <Link to='/perencanaan/periode'>
                    Buka Pengaturan Periode
                    <ExternalLink className='h-3 w-3' />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  // Case 2: Active evaluation period exists
  const sisaHari = activePeriode.sisa_hari

  let sisaHariBadge = null
  if (sisaHari !== null && sisaHari !== undefined) {
    if (sisaHari < 0) {
      sisaHariBadge = (
        <Badge variant='outline' className='bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] px-1.5 py-0'>
          Lewat {Math.abs(sisaHari)} Hari
        </Badge>
      )
    } else if (sisaHari <= 30) {
      sisaHariBadge = (
        <Badge variant='outline' className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0'>
          {sisaHari} Hari Tersisa
        </Badge>
      )
    } else {
      sisaHariBadge = (
        <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0'>
          {sisaHari} Hari Tersisa
        </Badge>
      )
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='group inline-flex h-8 items-center gap-1.5 sm:gap-2 px-2.5 rounded-md text-xs font-medium text-muted-foreground bg-muted/20 border border-border/40 hover:bg-muted/30 hover:border-border/60 hover:text-foreground transition-all cursor-pointer select-none whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring shrink-0'
          title={`Tahun Penilaian Aktif: ${activePeriode.tahun_penilaian} (${activePeriode.nama_periode})${
            sisaHari !== null && sisaHari !== undefined
              ? ` • Sisa Waktu: ${sisaHari < 0 ? `Lewat ${Math.abs(sisaHari)} Hari` : `${sisaHari} Hari Lagi`}`
              : ''
          }`}
        >
          <CalendarCheck className='h-3.5 w-3.5 text-primary shrink-0' />

          {/* Tahun Penilaian Label */}
          <span className='font-sans text-muted-foreground whitespace-nowrap'>
            <span className='hidden md:inline'>Tahun Penilaian: </span>
            <span className='inline md:hidden'>T.A. </span>
            <span className='text-foreground font-semibold'>{activePeriode.tahun_penilaian}</span>
          </span>

          {/* Sisa Waktu Penilaian */}
          {sisaHari !== null && sisaHari !== undefined && (
            <>
              <span className='text-muted-foreground/40 shrink-0'>•</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-semibold whitespace-nowrap transition-colors',
                  sisaHari < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : sisaHari <= 30
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                <Clock className='h-3 w-3 shrink-0' />
                <span className='hidden sm:inline'>
                  {sisaHari < 0
                    ? `Lewat ${Math.abs(sisaHari)} Hari`
                    : `${sisaHari} Hari Lagi`}
                </span>
                <span className='inline sm:hidden'>
                  {sisaHari < 0 ? `-${Math.abs(sisaHari)}h` : `${sisaHari}h`}
                </span>
              </span>
            </>
          )}

          {/* Dropdown Chevron */}
          <ChevronDown className='h-3 w-3 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0 ms-0.5' />
        </button>
      </PopoverTrigger>

      <PopoverContent align='end' className='w-88 p-4 space-y-3.5 shadow-lg'>
        {/* Header */}
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
              <CalendarCheck className='h-4 w-4' />
            </div>
            <div>
              <div className='text-xs font-medium text-muted-foreground'>Tahun Penilaian Berjalan</div>
              <div className='text-base font-bold text-foreground leading-tight'>
                Tahun Anggaran {activePeriode.tahun_penilaian}
              </div>
            </div>
          </div>
          <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-0.5 gap-1 shrink-0'>
            <span className='h-1.5 w-1.5 rounded-full bg-white animate-pulse' />
            Aktif
          </Badge>
        </div>

        <Separator />

        {/* Detailed Attributes */}
        <div className='space-y-2.5 text-xs'>
          <div className='flex items-start justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <FileText className='h-3.5 w-3.5 shrink-0 text-muted-foreground/70' />
              Periode / Dokumen
            </span>
            <span className='font-medium text-foreground text-right'>
              {activePeriode.nama_periode}
            </span>
          </div>

          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <CalendarRange className='h-3.5 w-3.5 shrink-0 text-muted-foreground/70' />
              Rentang Siklus RPJMD
            </span>
            <span className='font-medium text-foreground'>
              {activePeriode.rentang_tahun}
            </span>
          </div>

          {(activePeriode.tanggal_mulai || activePeriode.tanggal_akhir) && (
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Clock className='h-3.5 w-3.5 shrink-0 text-muted-foreground/70' />
                Batas Penginputan
              </span>
              <div className='flex items-center gap-1.5 font-medium text-foreground'>
                <span>
                  {activePeriode.tanggal_mulai ?? '-'} s/d {activePeriode.tanggal_akhir ?? '-'}
                </span>
                {sisaHariBadge}
              </div>
            </div>
          )}

          {activePeriode.keterangan && (
            <div className='rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5'>
              <Info className='h-3.5 w-3.5 shrink-0 mt-0.5 text-primary' />
              <span>{activePeriode.keterangan}</span>
            </div>
          )}
        </div>

        {/* Footer / Shortcut */}
        <Separator />
        <div className='pt-0.5 flex items-center justify-between gap-2'>
          <span className='text-[10px] text-muted-foreground italic leading-tight'>
            Seluruh data risiko & sasaran mengacu pada T.A. {activePeriode.tahun_penilaian}
          </span>
          {canManagePeriode && (
            <Button
              asChild
              variant='outline'
              size='sm'
              className='h-7 text-xs px-2.5 gap-1 shrink-0'
              onClick={() => setOpen(false)}
            >
              <Link to='/perencanaan/periode'>
                Kelola
                <ExternalLink className='h-3 w-3' />
              </Link>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
