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
        per_page: 100,
      }),
  })

  const logs = logsResponse?.data || []

  // KPI Computations
  const totalLogs = logs.length
  const authLogsCount = logs.filter((l) => l.module === 'Autentikasi').length
  const userLogsCount = logs.filter(
    (l) => l.module === 'Pegawai' || l.module === 'Peran & Izin'
  ).length
  const systemLogsCount = logs.filter(
    (l) => l.module === 'Pengaturan Sistem' || l.module === 'Master Data'
  ).length

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

        {/* Compact KPI Stats (matching Manajemen Pegawai style) */}
        <div className='grid gap-2.5 grid-cols-2 lg:grid-cols-4'>
          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>
                Total Catatan
              </span>
              <p className='text-lg font-bold text-foreground leading-tight'>
                {totalLogs}
              </p>
            </div>
            <div className='rounded-md bg-primary/10 p-2 text-primary'>
              <History className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>
                Aktivitas Sesi
              </span>
              <p className='text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight'>
                {authLogsCount}
              </p>
            </div>
            <div className='rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
              <UserCheck className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>
                Perubahan Pegawai & Peran
              </span>
              <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight'>
                {userLogsCount}
              </p>
            </div>
            <div className='rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
              <Shield className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>
                Sistem & Master Data
              </span>
              <p className='text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight'>
                {systemLogsCount}
              </p>
            </div>
            <div className='rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400'>
              <Activity className='h-4 w-4' />
            </div>
          </div>
        </div>

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
