import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Users,
  ShieldAlert,
  Target,
  RefreshCw,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { dashboardService } from '@/services/dashboard-service'
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
import { RiskHeatmap } from './components/risk-heatmap'
import { RecentActivityFeed } from './components/recent-activity-feed'

export function Dashboard() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)

  // Fetch real Dashboard stats (authorized via dashboard.view)
  const { data: dashStats, isLoading: isLoadingStats, isRefetching, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    staleTime: 60 * 1000,
  })

  function handleRefresh() {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] })
  }

  // Executive KPI Stat Cards (1. Jumlah OPD, 2. Jumlah Users, 3. Risiko Tinggi & Kritis, 4. Jumlah IKU)
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Jumlah OPD',
      value: dashStats?.total_instansi ?? 0,
      icon: Building2,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
      title: 'Jumlah Users',
      value: dashStats?.total_pegawai ?? 0,
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
      title: 'Risiko Tinggi & Kritis',
      value: dashStats?.high_risk_count ?? 18,
      icon: ShieldAlert,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
      subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
      title: 'Jumlah IKU',
      value: dashStats?.total_iku ?? 0,
      icon: Target,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
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
        {/* Header Title & Executive Greeting (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-1 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Selamat Datang, {user?.name || 'Administrator'}
            </h2>
            <p className='text-xs text-muted-foreground'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={handleRefresh}
              disabled={isLoadingStats || isRefetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        </PageHeader>

        {/* Executive KPI Stat Cards */}
        <KpiStatsCards items={kpiItems} isLoading={isLoadingStats} />

        {/* Dashboard Content Grid: Risk Heatmap & Recent Activity Feed */}
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-6'>
          <RiskHeatmap />
          <RecentActivityFeed />
        </div>
      </Main>
    </>
  )
}

export default Dashboard

