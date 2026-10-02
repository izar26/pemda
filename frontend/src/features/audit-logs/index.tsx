import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  History,
  Loader2,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react'
import { auditService } from '@/services/audit-service'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { AuditLogsTable } from './components/audit-logs-table'
import { AuditLogsDialogs } from './components/audit-logs-dialogs'
import {
  AuditLogsProvider,
} from './components/audit-logs-provider'

function AuditLogsContent() {
  const {
    data: logsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () =>
      auditService.getLogs({
        per_page: 200,
      }),
  })

  const logs = logsResponse?.data || []

  // KPI Computations
  const totalLogs = logs.length
  const authLogsCount = logs.filter((l) => l.module === 'Autentikasi').length
  const userLogsCount = logs.filter(
    (l) =>
      l.module === 'Pegawai' ||
      l.module === 'Profil' ||
      l.module === 'Organisasi (OPD)' ||
      l.module === 'Peran & Izin'
  ).length
  const systemLogsCount = logs.filter(
    (l) => l.module === 'Pengaturan Sistem' || l.module === 'Master Data'
  ).length

  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Catatan',
      value: totalLogs,
      icon: History,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Aktivitas Sesi',
      value: authLogsCount,
      icon: UserCheck,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Pegawai, OPD & Peran',
      value: userLogsCount,
      icon: Shield,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Sistem & Master Data',
      value: systemLogsCount,
      icon: Activity,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
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
        {/* Header Title & Actions */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Rekam Jejak & Log Audit Keamanan
            </h2>
            <p className='text-xs text-muted-foreground'>
              Transparansi riwayat aktivitas pengguna, sesi autentikasi, dan perubahan hak akses sistem.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Compact KPI Stats with Skeleton loading */}
        <KpiStatsCards items={kpiItems} isLoading={isLoading} />

        {/* Audit Logs Table / Loading State */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>
              Memuat data log audit keamanan...
            </p>
          </div>
        ) : (
          <AuditLogsTable data={logs} />
        )}
      </Main>

      <AuditLogsDialogs />
    </>
  )
}

export function AuditLogs() {
  return (
    <AuditLogsProvider>
      <AuditLogsContent />
    </AuditLogsProvider>
  )
}
