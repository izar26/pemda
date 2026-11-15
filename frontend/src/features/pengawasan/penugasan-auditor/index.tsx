import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  FileCheck,
  Loader2,
  RefreshCw,
  Users,
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
import { penugasanAuditorService } from '@/services/penugasan-auditor-service'
import { PenugasanProvider } from './components/penugasan-provider'
import { PenugasanPrimaryButtons } from './components/penugasan-primary-buttons'
import { PenugasanTable } from './components/penugasan-table'
import { PenugasanDialogs } from './components/penugasan-dialogs'

function PenugasanContent() {
  const queryClient = useQueryClient()

  // 1. Fetch Auditors with Assignments list
  const {
    data: auditorResponse,
    isLoading: isLoadingList,
    isRefetching: isRefetchingList,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['pengawasan', 'penugasan-auditor'],
    queryFn: () =>
      penugasanAuditorService.getAuditorsWithAssignments({ per_page: 200 }),
    staleTime: 60 * 1000,
  })

  // 2. Fetch Evaluator Assignment Stats
  const {
    data: statsData,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['pengawasan', 'penugasan-stats'],
    queryFn: () => penugasanAuditorService.getStats(),
    staleTime: 60 * 1000,
  })

  const isLoading = isLoadingList || isLoadingStats
  const isRefetching = isRefetchingList

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
    refetchList()
    refetchStats()
  }

  const auditorsList = useMemo(() => {
    if (Array.isArray(auditorResponse?.data)) {
      return auditorResponse.data
    }
    return []
  }, [auditorResponse?.data])

  const kpiItems: KpiStatItem[] = useMemo(() => {
    return [
      {
        title: 'Total Evaluator Bertugas',
        value: statsData?.total_auditor_bertugas ?? 0,
        icon: Users,
        color: 'bg-primary/10 text-primary',
        subtitle: 'Evaluator dengan binaan aktif',
      },
      {
        title: 'OPD Tercover',
        value: statsData?.total_opd_tercover ?? 0,
        icon: Building2,
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        subtitle: `${statsData?.total_opd_aktif ?? 0} total perangkat daerah`,
      },
      {
        title: 'OPD Belum Tercover',
        value: statsData?.total_opd_belum_tercover ?? 0,
        icon: AlertTriangle,
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        subtitle: 'Belum ada evaluator pengawas',
      },
      {
        title: 'Total Penugasan Aktif',
        value: statsData?.total_penugasan_aktif ?? 0,
        icon: FileCheck,
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        subtitle: 'Penetapan surat tugas aktif',
      },
    ]
  }, [statsData])

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
        {/* Sticky Page Header */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Penugasan Evaluator (Total: {auditorsList.length})
            </h2>
            <p className='text-xs text-muted-foreground'>
              Penetapan dan pembagian instansi perangkat daerah binaan evaluator Inspektorat untuk persetujuan (approval) lembar kerja risiko.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              Segarkan
            </Button>

            <PenugasanPrimaryButtons />
          </div>
        </PageHeader>

        {/* KPI Metric Summary Cards */}
        <KpiStatsCards
          items={kpiItems}
          isLoading={isLoadingStats}
          count={4}
        />

        {/* Standard TanStack Data Table */}
        {isLoadingList ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>
              Memuat data penugasan evaluator...
            </p>
          </div>
        ) : (
          <PenugasanTable data={auditorsList} />
        )}

        {/* Modal Dialogs */}
        <PenugasanDialogs onSuccess={handleRefresh} />
      </Main>
    </>
  )
}

export function PenugasanAuditorManagement() {
  return (
    <PenugasanProvider>
      <PenugasanContent />
    </PenugasanProvider>
  )
}

export const PenugasanEvaluatorManagement = PenugasanAuditorManagement

export default PenugasanAuditorManagement
