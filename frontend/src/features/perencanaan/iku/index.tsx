import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
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
import { IkuProvider, useIku } from './components/iku-provider'
import { IkuTable } from './components/iku-table'
import { IkuPrimaryButtons } from './components/iku-primary-buttons'
import { IkuDialogs } from './components/iku-dialogs'

function IkuContent() {
  const { tableFilters } = useIku()

  // 1. Fetch Indicators / IKU KPI Statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['perencanaan', 'iku', 'stats'],
    queryFn: () => perencanaanService.getIndikatorStats(),
    staleTime: 60 * 1000,
  })

  // 2. Fetch OPD list for table faceted filter
  const { data: opdData, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-for-iku-table'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
  })

  const opdList = opdData || []

  // 3. Fetch Indicators list
  const {
    data: indikatorData,
    isLoading: isLoadingList,
    isRefetching: isRefetchingList,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['perencanaan', 'iku', 'list'],
    queryFn: () => perencanaanService.getPaginatedIndikator({ all: true }),
  })

  const indikatorItems = indikatorData?.data || []
  const isLoading = isLoadingList || isLoadingStats || isLoadingOpds
  const isRefetching = isRefetchingList || isRefetchingStats

  const handleRefreshAll = () => {
    refetchList()
    refetchStats()
  }

  // 4. Construct KPI Stat Cards
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total IKU Renstra',
      value: stats?.total_iku ?? 0,
      subtitle: 'Indikator Kinerja Utama OPD',
      icon: Sparkles,
    },
    {
      title: 'Indikator Renstra Biasa',
      value: stats?.total_indikator_biasa ?? 0,
      subtitle: 'Indikator sasaran pendukung',
      icon: Target,
    },
    {
      title: 'Sasaran Terpetakan',
      value: `${stats?.sasaran_dengan_indikator ?? 0} / ${stats?.total_sasaran ?? 0}`,
      subtitle: 'Sasaran dengan indikator terukur',
      icon: Layers,
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
              Data IKU & Indikator Renstra OPD
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola Indikator Kinerja Utama (IKU) dan indikator sasaran Renstra perangkat daerah (Bapperida).
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/perencanaan/iku/export'
              params={tableFilters}
              filename='Data_IKU_dan_Indikator_Renstra_OPD.xlsx'
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

            <IkuPrimaryButtons />
          </div>
        </PageHeader>

        {/* KPI Summary Cards */}
        <KpiStatsCards items={kpiItems} isLoading={isLoading} count={4} />

        {/* Indicators DataTable with Tabs & Filters */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>Memuat data IKU & indikator...</p>
          </div>
        ) : (
          <IkuTable data={indikatorItems} opds={opdList} />
        )}

        {/* Dialogs Orchestrator */}
        <IkuDialogs onSuccess={handleRefreshAll} />
      </Main>
    </>
  )
}

export function PerencanaanIku() {
  return (
    <IkuProvider>
      <IkuContent />
    </IkuProvider>
  )
}

export default PerencanaanIku
