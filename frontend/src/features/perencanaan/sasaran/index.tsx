import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  Layers,
  Loader2,
  RefreshCw,
  Target,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
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
import { SasaranProvider, useSasaran } from './components/sasaran-provider'
import { SasaranTable } from './components/sasaran-table'
import { SasaranPrimaryButtons } from './components/sasaran-primary-buttons'
import { SasaranDialogs } from './components/sasaran-dialogs'

function SasaranContent() {
  const { tableFilters } = useSasaran()

  // 1. Fetch Targets KPI Statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['perencanaan', 'sasaran', 'stats'],
    queryFn: () => perencanaanService.getSasaranStats(),
    staleTime: 60 * 1000,
  })

  // 2. Fetch OPD list for table faceted filter
  const { data: opdData, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-for-sasaran-table'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  const opdList = opdData || []

  // 3. Fetch Targets list
  const {
    data: sasaranData,
    isLoading: isLoadingList,
    isRefetching: isRefetchingList,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['perencanaan', 'sasaran', 'list'],
    queryFn: () => perencanaanService.getPaginatedSasaran({ all: true }),
  })

  const sasaranItems = sasaranData?.data || []
  const isLoading = isLoadingList || isLoadingStats || isLoadingOpds
  const isRefetching = isRefetchingList || isRefetchingStats

  const handleRefreshAll = () => {
    refetchList()
    refetchStats()
  }

  // 4. Construct KPI Stat Cards
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Sasaran Renstra',
      value: stats?.total_sasaran ?? 0,
      subtitle: 'Rumusan sasaran OPD periode ini',
      icon: Target,
    },
    {
      title: 'Tujuan Terpetakan',
      value: `${stats?.tujuan_dengan_sasaran ?? 0} / ${stats?.total_tujuan ?? 0}`,
      subtitle: 'Tujuan Renstra yang memiliki sasaran',
      icon: Layers,
    },
    {
      title: 'OPD Terpetakan',
      value: `${stats?.opd_terpetakan ?? 0} / ${stats?.total_opd ?? 0}`,
      subtitle: 'Perangkat daerah yang telah input',
      icon: Building2,
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
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Header Title & Actions (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Data Sasaran Renstra OPD
            </h2>
            <p className='text-xs text-muted-foreground'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/perencanaan/sasaran/export'
              params={tableFilters}
              filename='Data_Sasaran_Renstra_OPD.xlsx'
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

            <SasaranPrimaryButtons />
          </div>
        </PageHeader>

        {/* KPI Summary Cards */}
        <KpiStatsCards items={kpiItems} isLoading={isLoading} count={4} />

        {/* Targets DataTable with Filters */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>Memuat data sasaran strategis...</p>
          </div>
        ) : (
          <SasaranTable data={sasaranItems} opds={opdList} />
        )}

        {/* Dialogs Orchestrator */}
        <SasaranDialogs onSuccess={handleRefreshAll} />
      </Main>
    </>
  )
}

export function PerencanaanSasaran() {
  return (
    <SasaranProvider>
      <SasaranContent />
    </SasaranProvider>
  )
}

export default PerencanaanSasaran
