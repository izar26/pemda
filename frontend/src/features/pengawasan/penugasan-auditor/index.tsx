import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserCheck,
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
import { usePermissions } from '@/hooks/use-permissions'
import { penugasanAuditorService } from '@/services/penugasan-auditor-service'
import {
  PenugasanProvider,
  usePenugasan,
} from './components/penugasan-provider'
import { PenugasanTable } from './components/penugasan-table'
import { PenugasanDialogs } from './components/penugasan-dialogs'

function PenugasanContent() {
  const queryClient = useQueryClient()
  const { setIsAddOpen } = usePenugasan()
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission('penugasan_auditor.create')

  // 1. Fetch Auditors with Assignments list
  const {
    data: auditorResponse,
    isLoading: isLoadingList,
    isRefetching: isRefetchingList,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['pengawasan', 'penugasan-auditor'],
    queryFn: () => penugasanAuditorService.getAuditorsWithAssignments({ per_page: 100 }),
    staleTime: 60 * 1000,
  })

  // 2. Fetch Coverage Statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['pengawasan', 'penugasan-stats'],
    queryFn: () => penugasanAuditorService.getStats(),
    staleTime: 60 * 1000,
  })

  const isLoading = isLoadingList || isLoadingStats
  const isRefetching = isRefetchingList || isRefetchingStats

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

  // Construct KPI Stat Cards
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Auditor Bertugas',
      value: stats?.total_auditor_bertugas ?? 0,
      subtitle: 'Auditor memiliki penugasan aktif',
      icon: UserCheck,
      color: 'blue',
    },
    {
      title: 'OPD Tercover',
      value: stats?.total_opd_tercover ?? 0,
      subtitle: `Dari total ${stats?.total_opd_aktif ?? 0} perangkat daerah`,
      icon: Building2,
      color: 'emerald',
    },
    {
      title: 'OPD Belum Ditugaskan',
      value: stats?.total_opd_belum_tercover ?? 0,
      subtitle: 'Belum memiliki auditor pembina',
      icon: ShieldAlert,
      color: stats?.total_opd_belum_tercover ? 'amber' : 'gray',
    },
    {
      title: 'Total Penugasan Aktif',
      value: stats?.total_penugasan_aktif ?? 0,
      subtitle: 'Akumulasi relasi auditor & OPD',
      icon: CheckCircle2,
      color: 'violet',
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
        {/* Sticky Page Header */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Penugasan Auditor Pengawas
            </h2>
            <p className='text-xs text-muted-foreground'>
              Penetapan cakupan OPD binaan auditor Inspektorat untuk persetujuan (approval) lembar kerja risiko (Form 2B, 2C, dst).
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

            {canCreate && (
              <Button
                size='sm'
                className='h-9 text-xs gap-1.5'
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className='h-3.5 w-3.5' />
                Tambah Penugasan
              </Button>
            )}
          </div>
        </PageHeader>

        {/* Coverage KPI Statistics Cards */}
        <KpiStatsCards items={kpiItems} isLoading={isLoadingStats} />

        {/* Auditor Table / Grid */}
        {isLoadingList ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-xl border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>
              Memuat data penugasan auditor...
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

export default PenugasanAuditorManagement
