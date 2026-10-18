import { getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { userService } from '@/services/user-service'
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
import { PegawaiDialogs } from './components/pegawai-dialogs'
import { PegawaiPrimaryButtons } from './components/pegawai-primary-buttons'
import { PegawaiProvider } from './components/pegawai-provider'
import { PegawaiTable } from './components/pegawai-table'

const route = getRouteApi('/_authenticated/pegawai/')

export function PegawaiManagement() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const {
    data: pegawaiResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['pegawai'],
    queryFn: () => userService.getPegawai({ per_page: 200 }),
    staleTime: 30 * 1000,
  })

  const pegawaiList = pegawaiResponse?.data || []
  const totalPegawai = pegawaiResponse?.meta?.total ?? pegawaiList.length

  return (
    <PegawaiProvider>
      <Header fixed>
        <Search className='me-auto' />
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Manajemen Pegawai (Total: {totalPegawai})
            </h2>
            <p className='text-xs text-muted-foreground'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/pegawai/export'
              params={{
                ...(search?.name ? { search: search.name } : {}),
                ...(Array.isArray(search?.jabatan) && search.jabatan.length > 0
                  ? { jabatan: search.jabatan[0] }
                  : {}),
              }}
              filename='Data_Pegawai_PEMDA.xlsx'
              label='Ekspor Excel'
            />

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
            <PegawaiPrimaryButtons />
          </div>
        </PageHeader>

        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>Memuat data pegawai...</p>
          </div>
        ) : (
          <PegawaiTable data={pegawaiList} search={search} navigate={navigate} />
        )}
      </Main>

      <PegawaiDialogs />
    </PegawaiProvider>
  )
}
