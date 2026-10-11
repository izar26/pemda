import { Search as SearchIcon, Calendar, CheckCircle2, Clock, ShieldCheck, Info } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/layout/page-header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { PerencanaanSubnav } from './perencanaan-subnav'
import { usePermissions } from '@/hooks/use-permissions'
import { usePeriodeOverview } from '../hooks/use-periode-query'
import {
  PeriodeProvider,
  usePeriode,
  PeriodeTable,
  PeriodeDialogs,
  PeriodePrimaryButtons,
} from './periode'

function PeriodeContent() {
  const { hasPermission, isSuperadmin } = usePermissions()
  const canManage = isSuperadmin || hasPermission('perencanaan.periode')
  const canView = isSuperadmin || hasPermission('perencanaan.view')

  const { search, setSearch, statusFilter, setStatusFilter } = usePeriode()
  const { data: overview, isLoading } = usePeriodeOverview()

  const cycles = overview?.data || []
  const activeYearObj = overview?.active || null
  const activeCycle = cycles.find((c) => c.status === 'Aktif' || c.status === 'active') || null

  const kpiItems: KpiStatItem[] = [
    {
      title: 'Tahun Penilaian Aktif',
      value: activeYearObj ? `Tahun ${activeYearObj.tahun_penilaian || activeYearObj.tahun}` : 'Belum Ada',
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      subtitle: activeCycle ? `${activeCycle.tahun_mulai} - ${activeCycle.tahun_selesai}` : 'Pilih tahun aktif',
    },
    {
      title: 'Periode Aktif Global',
      value: activeCycle ? `${activeCycle.tahun_mulai} - ${activeCycle.tahun_selesai}` : 'Nonaktif',
      icon: Calendar,
      color: 'bg-primary/10 text-primary',
      subtitle: activeCycle ? 'Siklus RPJMD Berjalan' : 'Aktifkan 1 periode',
    },
    {
      title: 'Total Siklus Terdaftar',
      value: cycles.length,
      icon: Clock,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
      subtitle: 'Siklus Perencanaan',
    },
    {
      title: 'Hak Akses Anda',
      value: canManage ? 'Kelola Penuh' : 'Hanya Lihat',
      icon: ShieldCheck,
      color: canManage ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground',
      subtitle: canManage ? 'Bapperida / Admin' : 'OPD / Auditor',
    },
  ]

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        <PerencanaanSubnav />

        {/* Page Header */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                Periode Penilaian
              </h2>
              {canManage ? (
                <Badge variant='outline' className='text-xs bg-primary/5 text-primary border-primary/20'>
                  Bapperida
                </Badge>
              ) : (
                <Badge variant='secondary' className='text-xs'>
                  Read-Only (OPD)
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Master siklus 5 tahunan RPJMD dan penentuan tahun aktif penilaian risiko Pemda Cianjur.
            </p>
          </div>

          <PeriodePrimaryButtons />
        </PageHeader>

        {/* Notice for Read-Only Users */}
        {!canManage && canView && (
          <div className='flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border/80 bg-muted/40 text-xs text-muted-foreground'>
            <Info className='h-4 w-4 text-primary shrink-0' />
            <span>
              Anda berada dalam mode tinjau. Pengaturan periode dan penetapan tahun aktif dikelola terpusat oleh <strong>Bapperida</strong>.
            </span>
          </div>
        )}

        {/* KPI Stats Cards */}
        <KpiStatsCards items={kpiItems} isLoading={isLoading} />

        {/* Toolbar & Filter */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
          <div className='flex flex-1 items-center gap-2 flex-wrap'>
            <div className='relative w-full sm:w-72'>
              <SearchIcon className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                placeholder='Cari periode atau tahun...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='h-8 text-xs pl-8'
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='h-8 text-xs w-full sm:w-[150px]'>
                <SelectValue placeholder='Semua Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Status</SelectItem>
                <SelectItem value='Aktif' className='text-xs'>Aktif Global</SelectItem>
                <SelectItem value='Tidak Aktif' className='text-xs'>Nonaktif</SelectItem>
                <SelectItem value='Arsip' className='text-xs'>Arsip</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== 'all') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
                className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground'
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Main Table */}
        <PeriodeTable />

        {/* Dialogs Modal (Create, Edit, Delete) */}
        <PeriodeDialogs />
      </Main>
    </>
  )
}

export function PeriodeManagement() {
  return (
    <PeriodeProvider>
      <PeriodeContent />
    </PeriodeProvider>
  )
}
