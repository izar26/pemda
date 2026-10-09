'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  Landmark,
  Loader2,
  RefreshCw,
  Users as UsersIcon,
} from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { ExportExcelButton } from '@/components/export-excel-button'
import { OpdProvider } from './components/opd-provider'
import { OpdPrimaryButtons } from './components/opd-primary-buttons'
import { OpdTable } from './components/opd-table'
import { OpdDialogs } from './components/opd-dialogs'

export function OpdManagement() {
  // Fetch paginated OPD data for table
  const {
    data: opdResponse,
    isLoading: isLoadingTable,
    isRefetching: isRefetchingTable,
    refetch: refetchTable,
  } = useQuery({
    queryKey: ['opds'],
    queryFn: () => opdService.getPaginatedOpds({ per_page: 100 }),
  })

  // Fetch OPD statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['opds-stats'],
    queryFn: () => opdService.getStats(),
  })

  const isLoading = isLoadingTable || isLoadingStats
  const isRefetching = isRefetchingTable || isRefetchingStats

  function handleRefresh() {
    refetchTable()
    refetchStats()
  }

  const opdsList = opdResponse?.data || []

  // 4 Standard Compact KPI Stats
  const totalInstansi = stats?.total ?? opdsList.length
  const activeInstansi = stats?.active ?? opdsList.filter((o) => o.is_active).length
  const dinasBadanCount =
    (stats?.by_kategori?.['Dinas'] ?? 0) + (stats?.by_kategori?.['Badan'] ?? 0) ||
    opdsList.filter((o) => o.kategori === 'Dinas' || o.kategori === 'Badan').length
  const totalPegawai = stats?.total_pegawai ?? 0

  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Instansi',
      value: totalInstansi,
      icon: Building2,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Instansi Aktif',
      value: activeInstansi,
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Dinas & Badan Daerah',
      value: dinasBadanCount,
      icon: Landmark,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Pegawai ASN Terdaftar',
      value: totalPegawai,
      icon: UsersIcon,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      valueColor: 'text-indigo-600 dark:text-indigo-400',
    },
  ]

  return (
    <OpdProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Header Title & Actions (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Perangkat Daerah (OPD)
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola unit kerja pemerintah daerah, sekretariat, dinas teknis, badan pendukung, RSUD, dan kecamatan.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/opds/export'
              filename='Data_Perangkat_Daerah_OPD.xlsx'
              label='Ekspor Excel'
            />
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
            <OpdPrimaryButtons />
          </div>
        </PageHeader>

        {/* Compact KPI Stats with Skeleton loading */}
        <KpiStatsCards items={kpiItems} isLoading={isLoading} />

        {/* OPD Data Table */}
        {isLoadingTable ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>Memuat data perangkat daerah...</p>
          </div>
        ) : (
          <OpdTable data={opdsList} />
        )}

        {/* Dialogs */}
        <OpdDialogs onSuccess={handleRefresh} />
      </Main>
    </OpdProvider>
  )
}

export default OpdManagement
