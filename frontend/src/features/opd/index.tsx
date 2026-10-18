import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import type { OpdItem } from '@/types/opd'
import { opdService } from '@/services/opd-service'
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
import { OpdProvider, useOpd } from './components/opd-provider'
import { OpdPrimaryButtons } from './components/opd-primary-buttons'
import { OpdTable } from './components/opd-table'
import { OpdDialogs } from './components/opd-dialogs'

function OpdContent() {
  const queryClient = useQueryClient()
  const { tableFilters } = useOpd()
  // Fetch paginated OPD data for table
  const {
    data: opdResponse,
    isLoading: isLoadingTable,
    isRefetching: isRefetchingTable,
    refetch: refetchTable,
  } = useQuery({
    queryKey: ['opds', 'management'],
    queryFn: () => opdService.getPaginatedOpds({ per_page: 100 }),
    staleTime: 60 * 1000,
  })

  // Fetch OPD statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['opds', 'stats'],
    queryFn: () => opdService.getStats(),
    staleTime: 2 * 60 * 1000,
  })

  const isLoading = isLoadingTable || isLoadingStats
  const isRefetching = isRefetchingTable || isRefetchingStats

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['opds'] })
    refetchTable()
    refetchStats()
  }

  const opdsList: OpdItem[] = Array.isArray(opdResponse)
    ? (opdResponse as unknown as OpdItem[])
    : Array.isArray(opdResponse?.data)
      ? opdResponse.data
      : []

  const totalInstansi = stats?.total ?? opdsList.length

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
              Perangkat Daerah (Total: {totalInstansi})
            </h2>
            <p className='text-xs text-muted-foreground'>
              Sekertariat Daerah, SKPD, RSUD Dan Kecamatan.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/opds/export'
              params={tableFilters}
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
    </>
  )
}

export function OpdManagement() {
  return (
    <OpdProvider>
      <OpdContent />
    </OpdProvider>
  )
}

export default OpdManagement
