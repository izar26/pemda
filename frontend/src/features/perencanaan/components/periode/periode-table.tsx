import { useMemo } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Archive,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { usePermissions } from '@/hooks/use-permissions'
import { usePeriode } from './periode-provider'
import {
  usePeriodeOverview,
  usePeriodeMutations,
  PERIODE_QUERY_KEY,
} from '../../hooks/use-periode-query'
import { perencanaanService } from '@/services/perencanaan-service'
import { cn } from '@/lib/utils'
import type { PeriodePerencanaan, PeriodeStatus } from '@/types/perencanaan'

export function PeriodeTable() {
  const { hasPermission, isSuperadmin } = usePermissions()
  const canManage = isSuperadmin || hasPermission('perencanaan.periode')
  const { setOpen, setCurrentRow, search, statusFilter } = usePeriode()
  const { data: overview, isLoading } = usePeriodeOverview()
  const { activateYear } = usePeriodeMutations()
  const queryClient = useQueryClient()

  const cycles: PeriodePerencanaan[] = overview?.data || []

  // Filtered List
  const filteredCycles = useMemo(() => {
    return cycles.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch =
        c.nama.toLowerCase().includes(q) ||
        String(c.tahun_mulai).includes(q) ||
        String(c.tahun_selesai).includes(q) ||
        (c.keterangan && c.keterangan.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === 'all' ||
        c.status === statusFilter ||
        (statusFilter === 'Aktif' && (c.status === 'active' || c.status === 'Aktif')) ||
        (statusFilter === 'Tidak Aktif' && (c.status === 'inactive' || c.status === 'Tidak Aktif')) ||
        (statusFilter === 'Arsip' && (c.status === 'archived' || c.status === 'Arsip'))

      return matchesSearch && matchesStatus
    })
  }, [cycles, search, statusFilter])

  // 1-Click Switch Active Year dari Dropdown Baris Tabel
  const handleSwitchYear = async (cycleId: string, yearId: string) => {
    if (!canManage) return
    await activateYear.mutateAsync({ periodeId: cycleId, tahunId: yearId })
  }

  // Toggle Periode Aktif Global
  const handleToggleGlobalActive = async (cycleId: string) => {
    if (!canManage) return
    try {
      await perencanaanService.togglePeriodeStatus(cycleId, 'Aktif')
      toast.success('Periode berhasil diaktifkan secara global.')
      queryClient.invalidateQueries({ queryKey: PERIODE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['perencanaan-cascading'] })
    } catch {
      toast.error('Gagal mengaktifkan periode.')
    }
  }

  // Helper Badge Status
  const getStatusBadge = (status: PeriodeStatus) => {
    switch (status) {
      case 'Aktif':
      case 'active':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-medium gap-1 px-2.5 py-0.5'>
            <CheckCircle2 className='h-3 w-3 text-emerald-600 dark:text-emerald-400' /> Aktif Global
          </Badge>
        )
      case 'Tidak Aktif':
      case 'inactive':
        return (
          <Badge variant='outline' className='text-muted-foreground gap-1 px-2.5 py-0.5'>
            <Clock className='h-3 w-3' /> Nonaktif
          </Badge>
        )
      case 'Arsip':
      case 'archived':
        return (
          <Badge variant='secondary' className='text-muted-foreground gap-1 px-2.5 py-0.5'>
            <Archive className='h-3 w-3' /> Arsip
          </Badge>
        )
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-xs text-muted-foreground'>Memuat data periode perencanaan...</p>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-md border bg-card shadow-2xs'>
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/30'>
            <TableHead className='w-12 font-bold text-xs text-center'>No</TableHead>
            <TableHead className='w-52 font-bold text-xs'>Periode RPJMD</TableHead>
            <TableHead className='w-64 font-bold text-xs'>Tahun Aktif Penilaian</TableHead>
            <TableHead className='w-36 font-bold text-xs text-center'>Status</TableHead>
            <TableHead className='font-bold text-xs'>Keterangan</TableHead>
            <TableHead className='w-16 font-bold text-xs text-end'>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCycles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-xs'>
                Tidak ada data periode perencanaan yang ditemukan.
              </TableCell>
            </TableRow>
          ) : (
            filteredCycles.map((cycle, index) => {
              const isCycleActive = cycle.status === 'Aktif' || cycle.status === 'active'
              const yearsList = cycle.tahun_penilaians || []
              const activeChild = yearsList.find((y) => y.status === 'Aktif' || y.status === 'active')

              return (
                <TableRow
                  key={cycle.id}
                  className={cn(
                    'transition-colors',
                    isCycleActive ? 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]' : 'hover:bg-muted/40'
                  )}
                >
                  <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                    {index + 1}
                  </TableCell>

                  {/* Kolom 1: Rentang Periode */}
                  <TableCell className='text-xs'>
                    <div className='flex items-center gap-2.5 py-1'>
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs',
                          isCycleActive
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        <Calendar className='h-4 w-4' />
                      </div>
                      <div className='flex flex-col min-w-0'>
                        <span className='font-bold text-sm font-mono text-foreground leading-tight'>
                          {cycle.tahun_mulai} - {cycle.tahun_selesai}
                        </span>
                        <span className='text-[11px] text-muted-foreground truncate mt-0.5'>
                          {cycle.nama || 'Siklus RPJMD'}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Kolom 2: Tahun Aktif (Dropdown Ganti Instan 1-Click) */}
                  <TableCell className='text-xs'>
                    <div className='flex items-center gap-2'>
                      {canManage ? (
                        <Select
                          value={activeChild ? String(activeChild.id) : ''}
                          onValueChange={(newYearId) => handleSwitchYear(cycle.id, newYearId)}
                          disabled={activateYear.isPending}
                        >
                          <SelectTrigger className='h-8 text-xs font-semibold w-[180px] bg-background'>
                            <div className='flex items-center justify-between w-full pr-1 truncate'>
                              {activeChild ? (
                                <div className='flex items-center gap-1.5'>
                                  <span className='font-mono font-bold text-emerald-700 dark:text-emerald-400'>
                                    Tahun {activeChild.tahun}
                                  </span>
                                  <Badge className='bg-emerald-600 text-white text-[9px] px-1 py-0 h-4'>
                                    Aktif
                                  </Badge>
                                </div>
                              ) : (
                                <div className='flex items-center gap-1.5 text-muted-foreground'>
                                  <span className='font-mono font-medium'>
                                    Tahun {cycle.tahun_mulai}
                                  </span>
                                  <Badge variant='outline' className='text-[9px] px-1 py-0 h-4 text-muted-foreground border-dashed'>
                                    Nonaktif
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {yearsList.map((y) => {
                              const isThisYearActive = y.status === 'Aktif' || y.status === 'active'
                              return (
                                <SelectItem key={y.id} value={String(y.id)} className='text-xs'>
                                  <div className='flex items-center justify-between w-full gap-3'>
                                    <span className={cn('font-mono', isThisYearActive ? 'font-bold text-emerald-600' : 'font-medium')}>
                                      Tahun {y.tahun}
                                    </span>
                                    {isThisYearActive ? (
                                      <Badge className='text-[9px] bg-emerald-600 text-white px-1.5 py-0'>
                                        Sedang Aktif
                                      </Badge>
                                    ) : (
                                      <span className='text-[10px] text-muted-foreground'>
                                        Pilih untuk aktifkan
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className='flex items-center gap-1.5'>
                          <Badge
                            variant={isCycleActive ? 'default' : 'outline'}
                            className={cn(
                              'font-mono text-xs font-semibold px-2 py-0.5',
                              isCycleActive
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                                : 'text-muted-foreground'
                            )}
                          >
                            Tahun {activeChild?.tahun || cycle.tahun_mulai}
                          </Badge>
                          {isCycleActive && (
                            <span className='text-[10px] text-emerald-600 font-medium'>Aktif</span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Kolom 3: Status Siklus */}
                  <TableCell className='text-center'>
                    {getStatusBadge(cycle.status)}
                  </TableCell>

                  {/* Kolom 4: Keterangan */}
                  <TableCell className='text-xs text-muted-foreground max-w-[220px] truncate'>
                    {cycle.keterangan || '-'}
                  </TableCell>

                  {/* Kolom 5: Aksi */}
                  <TableCell className='text-end'>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' className='h-8 w-8 p-0'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-48 text-xs'>
                        {canManage && !isCycleActive && (
                          <DropdownMenuItem
                            onClick={() => handleToggleGlobalActive(cycle.id)}
                            className='text-emerald-600 focus:text-emerald-700'
                          >
                            <ShieldCheck className='h-3.5 w-3.5 mr-2' />
                            Set Aktif Global
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem
                            onClick={() => {
                              setCurrentRow(cycle)
                              setOpen('edit')
                            }}
                          >
                            <Pencil className='h-3.5 w-3.5 mr-2 text-amber-600' />
                            Edit Periode
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentRow(cycle)
                                setOpen('delete')
                              }}
                              className='text-destructive focus:text-destructive'
                            >
                              <Trash2 className='h-3.5 w-3.5 mr-2' />
                              Hapus Periode
                            </DropdownMenuItem>
                          </>
                        )}
                        {!canManage && (
                          <DropdownMenuItem disabled className='text-muted-foreground'>
                            Hanya Baca (Bapperida)
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
