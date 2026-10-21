import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Crosshair,
  Flag,
  Gauge,
  Loader2,
  RefreshCw,
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
import { useAuthStore } from '@/stores/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { TujuanProvider, useTujuan } from './components/tujuan-provider'
import { TujuanTable } from './components/tujuan-table'
import { TujuanPrimaryButtons } from './components/tujuan-primary-buttons'
import { TujuanDialogs } from './components/tujuan-dialogs'

function TujuanContent() {
  const { tableFilters } = useTujuan()
  const user = useAuthStore((state) => state.auth.user)
  const { hasRole } = usePermissions()

  // Detect whether current user is an OPD role (scoped strictly to own institution)
  const isOpdRole = Boolean(
    (hasRole('OPD') || Boolean(user?.opd_id)) &&
    !hasRole('Superadmin') &&
    !hasRole('Admin Office') &&
    !hasRole('Bapperida') &&
    !hasRole('Inspektorat') &&
    !hasRole('Auditor')
  )

  // 1. Fetch Cascading KPI Statistics (Tujuan + Sasaran + Indikator)
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['perencanaan', 'tujuan', 'stats', isOpdRole ? user?.opd_id : 'all'],
    queryFn: () => perencanaanService.getTujuanStats(),
    staleTime: 60 * 1000,
  })

  // 2. Fetch OPD list for filter (Only needed for Admin/Bapperida)
  const { data: opdData, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-for-tujuan-table'],
    queryFn: () => opdService.getOpds({ all: true }),
    enabled: !isOpdRole,
    staleTime: 5 * 60 * 1000,
  })

  const opdList = useMemo(() => {
    if (isOpdRole && user?.opd) {
      return [user.opd]
    }
    return opdData || []
  }, [isOpdRole, user?.opd, opdData])

  // 3. Fetch Tujuan list
  const {
    data: tujuanData,
    isLoading: isLoadingTujuan,
    isRefetching: isRefetchingTujuan,
    refetch: refetchTujuan,
  } = useQuery({
    queryKey: ['perencanaan', 'tujuan', 'list'],
    queryFn: () => perencanaanService.getPaginatedTujuan({ all: true }),
  })

  // 4. Fetch Sasaran list
  const {
    data: sasaranData,
    isLoading: isLoadingSasaran,
    isRefetching: isRefetchingSasaran,
    refetch: refetchSasaran,
  } = useQuery({
    queryKey: ['perencanaan', 'sasaran', 'list'],
    queryFn: () => perencanaanService.getPaginatedSasaran({ all: true }),
  })

  // 5. Fetch Indikator list
  const {
    data: indikatorData,
    isLoading: isLoadingIndikator,
    isRefetching: isRefetchingIndikator,
    refetch: refetchIndikator,
  } = useQuery({
    queryKey: ['perencanaan', 'indikator', 'list'],
    queryFn: () => perencanaanService.getPaginatedIndikator({ all: true }),
  })

  const tujuanItems = useMemo(() => tujuanData?.data || [], [tujuanData?.data])
  const sasaranItems = useMemo(() => sasaranData?.data || [], [sasaranData?.data])
  const indikatorItems = useMemo(
    () => indikatorData?.data || [],
    [indikatorData?.data]
  )

  const isLoading =
    isLoadingTujuan ||
    isLoadingSasaran ||
    isLoadingIndikator ||
    isLoadingStats ||
    isLoadingOpds
  const isRefetching =
    isRefetchingTujuan ||
    isRefetchingSasaran ||
    isRefetchingIndikator ||
    isRefetchingStats

  const handleRefreshAll = () => {
    refetchTujuan()
    refetchSasaran()
    refetchIndikator()
    refetchStats()
  }

  // 6. Construct Unified KPI Stat Cards (3 Cards for OPD, 4 Cards for Admin)
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Tujuan',
      value: stats?.total_tujuan ?? 0,
      subtitle: isOpdRole
        ? `Rumusan tujuan ${user?.opd?.nama || 'OPD Anda'}`
        : 'Rumusan tujuan OPD periode ini',
      icon: Flag,
    },
    {
      title: 'Total Sasaran',
      value: stats?.total_sasaran ?? 0,
      subtitle: isOpdRole
        ? 'Turunan sasaran pada OPD Anda'
        : 'Turunan sasaran dari tujuan OPD',
      icon: Crosshair,
    },
    {
      title: 'Total Indikator',
      value: stats?.total_indikator ?? 0,
      subtitle: `${stats?.total_iku ?? 0} IKU · ${stats?.total_indikator_biasa ?? 0} Indikator Biasa`,
      icon: Gauge,
    },
    ...(!isOpdRole
      ? [
          {
            title: 'OPD Terpetakan',
            value: `${stats?.opd_terpetakan ?? 0} / ${stats?.total_opd ?? 0}`,
            subtitle: `${stats?.persentase_pemetaan ?? 0}% cakupan instansi daerah`,
            icon: Building2,
          },
        ]
      : []),
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
              Tujuan, Sasaran & Indikator
            </h2>
            <p className='text-xs text-muted-foreground'>
              {isOpdRole
                ? `Pohon Kinerja (Cascading) Tujuan, Sasaran, dan Indikator Kinerja Utama ${user?.opd?.nama || 'Perangkat Daerah'}.`
                : 'Pohon Kinerja (Cascading) Seluruh Perangkat Daerah Kabupaten Cianjur Periode Aktif.'}
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            {!isOpdRole && (
              <ExportExcelButton
                endpoint='/perencanaan/tujuan/export'
                params={tableFilters}
                filename='Data_Tujuan_Sasaran_Indikator_OPD.xlsx'
                label='Ekspor Excel'
              />
            )}

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

        {/* KPI Summary Cards (Dihilangkan untuk role OPD) */}
        {!isOpdRole && (
          <KpiStatsCards
            items={kpiItems}
            isLoading={isLoading}
            count={4}
            className='lg:grid-cols-4'
          />
        )}

        {/* 3-Level Cascading Tree with Drag-and-Drop Reordering */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>
              Memuat struktur cascading Tujuan, Sasaran & Indikator...
            </p>
          </div>
        ) : (
          <TujuanTable
            data={tujuanItems}
            sasarans={sasaranItems}
            indikators={indikatorItems}
            opds={opdList}
            onRefresh={handleRefreshAll}
            isOpdRole={isOpdRole}
          />
        )}

        {/* Cascading Dialogs Orchestrator */}
        <TujuanDialogs onSuccess={handleRefreshAll} isOpdRole={isOpdRole} />
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
