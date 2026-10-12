import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Flag,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { ExportExcelButton } from '@/components/export-excel-button'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { TujuanProvider, useTujuan } from './components/tujuan-provider'
import { TujuanTable } from './components/tujuan-table'
import { TujuanPrimaryButtons } from './components/tujuan-primary-buttons'
import { TujuanDialogs } from './components/tujuan-dialogs'

function TujuanContent() {
  const { tableFilters } = useTujuan()

  // 1. Fetch Goals KPI Statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['perencanaan', 'tujuan', 'stats'],
    queryFn: () => perencanaanService.getTujuanStats(),
    staleTime: 60 * 1000,
  })

  // 2. Fetch OPD list for table faceted filter
  const { data: opdData, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-for-tujuan-table'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  const opdList = opdData || []

  // 3. Fetch Goals list
  const {
    data: tujuanData,
    isLoading: isLoadingList,
    isRefetching: isRefetchingList,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['perencanaan', 'tujuan', 'list'],
    queryFn: () => perencanaanService.getPaginatedTujuan({ all: true }),
  })

  const tujuanItems = tujuanData?.data || []
  const isLoading = isLoadingList || isLoadingStats || isLoadingOpds
  const isRefetching = isRefetchingList || isRefetchingStats

  const handleRefreshAll = () => {
    refetchList()
    refetchStats()
  }

  // 4. Construct KPI Stat Cards with exact theme colors
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Tujuan Renstra',
      value: stats?.total_tujuan ?? 0,
      subtitle: 'Rumusan tujuan OPD periode ini',
      icon: Flag,
    },
    {
      title: 'OPD Terpetakan',
      value: `${stats?.opd_terpetakan ?? 0} / ${stats?.total_opd ?? 0}`,
      subtitle: 'Perangkat daerah yang telah input',
      icon: Building2,
    },
    {
      title: 'Tingkat Kelengkapan',
      value: `${stats?.persentase_pemetaan ?? 0}%`,
      subtitle: 'Cakupan instansi daerah',
      icon: CheckCircle2,
    },
    {
      title: 'Siklus Perencanaan',
      value: stats?.periode_aktif
        ? `Tahun ${stats.periode_aktif.tahun_penilaian}`
        : 'Belum Aktif',
      subtitle: stats?.periode_aktif?.nama_periode ?? 'Tidak ada siklus aktif',
      icon: Calendar,
    },
  ]

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Header Title & Actions (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Data Tujuan Renstra OPD
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola rumusan tujuan strategis perangkat daerah untuk periode perencanaan yang sedang aktif (Bapperida).
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/perencanaan/tujuan/export'
              params={tableFilters}
              filename='Data_Tujuan_Renstra_OPD.xlsx'
              label='Ekspor Excel'
            />

            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={handleRefreshAll}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              Segarkan
            </Button>

            <TujuanPrimaryButtons />
          </div>
        </PageHeader>

        {/* KPI Summary Cards */}
        <KpiStatsCards items={kpiItems} isLoading={isLoading} count={4} />

        {/* Goals DataTable with Filters */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>Memuat data tujuan strategis...</p>
          </div>
        ) : (
          <TujuanTable data={tujuanItems} opds={opdList} />
        )}

        {/* Gold Standard Dialogs Orchestrator */}
        <TujuanDialogs onSuccess={handleRefreshAll} />
      </Main>
    </>
  )
}

export function PerencanaanTujuan() {
  return (
    <TujuanProvider>
      <TujuanContent />
    </TujuanProvider>
  )
}
