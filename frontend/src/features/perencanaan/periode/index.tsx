'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { PeriodePenilaianItem } from '@/types/perencanaan'
import { perencanaanService } from '@/services/perencanaan-service'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { ExportExcelButton } from '@/components/export-excel-button'
import { PeriodeProvider, usePeriode } from './components/periode-provider'
import { PeriodePrimaryButtons } from './components/periode-primary-buttons'
import { PeriodeTable } from './components/periode-table'
import { PeriodeDialogs } from './components/periode-dialogs'

function PeriodeContent() {
  const queryClient = useQueryClient()
  const { tableFilters } = usePeriode()

  // Fetch paginated periods
  const {
    data: periodeResponse,
    isLoading: isLoadingTable,
    isRefetching: isRefetchingTable,
    refetch: refetchTable,
  } = useQuery({
    queryKey: ['perencanaan', 'periode', 'list'],
    queryFn: () => perencanaanService.getPaginatedPeriodes({ per_page: 100 }),
    staleTime: 60 * 1000,
  })

  // Fetch period statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['perencanaan', 'periode', 'stats'],
    queryFn: () => perencanaanService.getStats(),
    staleTime: 60 * 1000,
  })

  const isLoading = isLoadingTable || isLoadingStats
  const isRefetching = isRefetchingTable || isRefetchingStats

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['perencanaan', 'periode'] })
    refetchTable()
    refetchStats()
  }

  const periodeList: PeriodePenilaianItem[] = Array.isArray(periodeResponse?.data)
    ? periodeResponse.data
    : []

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <NavbarStatus />
        <div className='flex items-center space-x-2 sm:space-x-3'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Header Title & Actions (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Periode Penilaian
            </h2>
            <p className='text-xs text-muted-foreground'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/perencanaan/periode/export'
              params={tableFilters}
              filename='Data_Periode_Penilaian_RPJMD.xlsx'
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
            <PeriodePrimaryButtons />
          </div>
        </PageHeader>

        {/* Warning Banner: Zero Active Period State Protection */}
        {!stats?.aktif && !isLoading && (
          <div className='flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'>
            <AlertTriangle className='h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400' />
            <div className='flex-1 text-xs'>
              <span className='font-semibold'>Perhatian: Belum Ada Periode Penilaian yang Aktif!</span>
              <p className='mt-0.5 text-muted-foreground'>
                Seluruh modul turunan (Cascading Kinerja Makro Bapperida dan Pengelolaan Risiko OPD) membutuhkan satu periode aktif sebagai acuan. Silakan klik tombol <strong>"Aktifkan"</strong> pada salah satu baris periode di bawah ini.
              </p>
            </div>
          </div>
        )}

        {/* Main Data Table */}
        {isLoading && !isRefetching ? (
          <div className='flex h-64 items-center justify-center rounded-xl border border-dashed'>
            <div className='flex flex-col items-center gap-2 text-muted-foreground'>
              <Loader2 className='h-8 w-8 animate-spin' />
              <p className='text-sm'>Memuat data periode penilaian...</p>
            </div>
          </div>
        ) : (
          <PeriodeTable data={periodeList} />
        )}

        <PeriodeDialogs onSuccess={handleRefresh} />
      </Main>
    </>
  )
}

export function PeriodeManagement() {
  return (
    <PeriodeProvider>
      <PeriodeContent />
    </PeriodeProvider>
  )
}
