import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  RefreshCw,
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

  const isLoading = isLoadingList
  const isRefetching = isRefetchingList

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
    refetchList()
  }

  const auditorsList = useMemo(() => {
    if (Array.isArray(auditorResponse?.data)) {
      return auditorResponse.data
    }
    return []
  }, [auditorResponse?.data])

  const totalAuditors = auditorResponse?.meta?.total ?? auditorsList.length

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
              Penugasan Auditor (Total: {totalAuditors})
            </h2>
            <p className='text-xs text-muted-foreground'>
              Penetapan dan pembagian instansi perangkat daerah binaan auditor Inspektorat untuk persetujuan (approval) lembar kerja risiko.
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

        {/* Standard TanStack Data Table */}
        {isLoadingList ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
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
