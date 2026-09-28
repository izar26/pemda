import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  History,
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

export function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')

  const {
    data: logsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', searchQuery, moduleFilter],
    queryFn: () =>
      auditService.getLogs({
        search: searchQuery,
        module: moduleFilter,
        per_page: 50,
      }),
  })

  const logs = logsResponse?.data || []

  // KPI Computations
  const totalLogs = logs.length
  const authLogsCount = logs.filter((l) => l.module === 'Autentikasi').length
  const userLogsCount = logs.filter((l) => l.module === 'Pegawai' || l.module === 'Peran & Izin').length
  const systemLogsCount = logs.filter((l) => l.module === 'Pengaturan Sistem').length

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4'>
        {/* Header Title */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold tracking-tight text-foreground'>
              Rekam Jejak & Log Audit Keamanan
            </h2>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Transparansi riwayat aktivitas pengguna, sesi autentikasi, dan perubahan hak akses sistem.
            </p>
          </div>

          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>

        {/* Compact KPI Stats */}
        <div className='grid gap-2.5 grid-cols-2 lg:grid-cols-4'>
          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Total Catatan</span>
              <p className='text-lg font-bold text-foreground leading-tight'>{totalLogs}</p>
            </div>
            <div className='rounded-md bg-primary/10 p-2 text-primary'>
              <History className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Aktivitas Sesi</span>
              <p className='text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight'>{authLogsCount}</p>
            </div>
            <div className='rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
              <UserCheck className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Perubahan Pegawai & Peran</span>
              <p className='text-lg font-bold text-purple-600 dark:text-purple-400 leading-tight'>{userLogsCount}</p>
            </div>
            <div className='rounded-md bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400'>
              <Shield className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Pengaturan Sistem</span>
              <p className='text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight'>{systemLogsCount}</p>
            </div>
            <div className='rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400'>
              <Activity className='h-4 w-4' />
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <AuditLogsTable
          logs={logs}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          moduleFilter={moduleFilter}
          onModuleChange={setModuleFilter}
          isLoading={isLoading}
        />
      </Main>
    </>
  )
}
