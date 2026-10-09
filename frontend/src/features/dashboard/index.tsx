import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldAlert,
  AlertTriangle,
  Award,
  Building2,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { opdService } from '@/services/opd-service'
import { userService } from '@/services/user-service'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { ExportExcelButton } from '@/components/export-excel-button'
import { RiskHeatmap } from './components/risk-heatmap'
import { MitigationTrendChart } from './components/mitigation-trend-chart'
import { OpdRiskRanking } from './components/opd-risk-ranking'
import { RecentActivityFeed } from './components/recent-activity-feed'

export function Dashboard() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'opd'>('overview')

  // Fetch real OPD stats for live counters
  const { data: opdStats, isLoading: isLoadingOpd, isRefetching, refetch } = useQuery({
    queryKey: ['dashboard-opd-stats'],
    queryFn: () => opdService.getStats(),
  })

  // Fetch users count
  const { data: usersData } = useQuery({
    queryKey: ['dashboard-users-count'],
    queryFn: () => userService.getUsers({ per_page: 1 }),
  })

  function handleRefresh() {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] })
  }

  const totalInstansi = opdStats?.total ?? 40
  const activeInstansi = opdStats?.active ?? 38
  const totalPegawai = usersData?.meta?.total ?? opdStats?.total_pegawai ?? 124

  // Executive KPI Stat Cards
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Profil Risiko PEMDA',
      value: 148,
      icon: ShieldAlert,
      color: 'bg-primary/10 text-primary',
      subtitle: '82% Memiliki Rencana Mitigasi',
    },
    {
      title: 'Risiko Tinggi & Kritis',
      value: 18,
      icon: AlertTriangle,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-600 dark:text-rose-400',
      subtitle: 'Prioritas Penanganan Pimpinan',
    },
    {
      title: 'Indeks Maturitas SPIP',
      value: '3.24',
      icon: Award,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
      subtitle: 'Predikat Terintegrasi Sangat Baik',
    },
    {
      title: 'Kepatuhan Instansi OPD',
      value: `${Math.round((activeInstansi / totalInstansi) * 100)}%`,
      icon: Building2,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      subtitle: `${activeInstansi} dari ${totalInstansi} OPD Aktif`,
    },
  ]

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Header Title & Executive Greeting (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-1 min-w-0 flex-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                Selamat Datang, {user?.name || 'Administrator'}
              </h2>
              <Badge
                variant='outline'
                className='bg-primary/5 text-primary border-primary/20 text-xs px-2.5 py-0.5 font-semibold gap-1.5'
              >
                <Calendar className='h-3 w-3' />
                Tahun Anggaran 2026
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground'>
              Ringkasan Eksekutif Profil Risiko, Pengawasan SPIP, dan Kinerja Instansi Pemerintah Daerah.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/opds/export'
              filename='Laporan_Ringkasan_Eksekutif_PEMDA.xlsx'
              label='Ekspor Laporan'
            />
            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={handleRefresh}
              disabled={isLoadingOpd || isRefetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        </PageHeader>

        {/* Executive Banner Status Card */}
        <div className='relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 text-card-foreground shadow-2xs'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10'>
            <div className='space-y-1 max-w-2xl'>
              <div className='flex items-center gap-2'>
                <ShieldCheck className='h-5 w-5 text-primary' />
                <h3 className='font-bold text-sm sm:text-base text-foreground'>
                  Sistem Tata Kelola & Pengendalian Intern Terintegrasi
                </h3>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Pemantauan real-time pelaksanaan Manajemen Risiko di <strong>{totalInstansi} Perangkat Daerah (OPD)</strong> dengan dukungan <strong>{totalPegawai} Pegawai Terdaftar</strong>. Seluruh proses audit terlindungi oleh kubah arsip WORM.
              </p>
            </div>

            <div className='flex items-center gap-3 shrink-0'>
              <div className='flex flex-col items-end text-xs'>
                <span className='text-muted-foreground'>Tanggal Hari Ini</span>
                <span className='font-bold text-foreground'>{currentDateStr}</span>
              </div>
              <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3 py-1.5 gap-1.5 shadow-2xs'>
                <CheckCircle2 className='h-3.5 w-3.5' /> Sistem Normal
              </Badge>
            </div>
          </div>
        </div>

        {/* Executive KPI Stat Cards */}
        <KpiStatsCards items={kpiItems} isLoading={isLoadingOpd} />

        {/* Tab Navigation Dashboard */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'overview' | 'matrix' | 'opd')}
          className='space-y-4'
        >
          <TabsList className='grid grid-cols-3 max-w-md h-9 p-1 bg-muted/50'>
            <TabsTrigger
              value='overview'
              className='text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
            >
              <TrendingUp className='h-3.5 w-3.5 text-primary' />
              Ringkasan Eksekutif
            </TabsTrigger>
            <TabsTrigger
              value='matrix'
              className='text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
            >
              <ShieldAlert className='h-3.5 w-3.5 text-rose-500' />
              Peta Risiko
            </TabsTrigger>
            <TabsTrigger
              value='opd'
              className='text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
            >
              <Building2 className='h-3.5 w-3.5 text-blue-500' />
              Kepatuhan OPD
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Ringkasan Eksekutif Main Grid */}
          <TabsContent value='overview' className='space-y-4 m-0'>
            {/* Grid Row 1: Mitigation Trend + Risk Heatmap */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <MitigationTrendChart />
              <RiskHeatmap />
            </div>

            {/* Grid Row 2: Top OPD Ranking Spotlight + Live Security Feed */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <OpdRiskRanking />
              <RecentActivityFeed />
            </div>
          </TabsContent>

          {/* Tab 2: Peta Risiko Detailed Matrix View */}
          <TabsContent value='matrix' className='space-y-4 m-0'>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <RiskHeatmap />
              <MitigationTrendChart />
            </div>
          </TabsContent>

          {/* Tab 3: Kepatuhan OPD Detailed View */}
          <TabsContent value='opd' className='space-y-4 m-0'>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <OpdRiskRanking />
              <RecentActivityFeed />
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

export default Dashboard
