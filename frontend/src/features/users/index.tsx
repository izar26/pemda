import { getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users as UsersIcon,
} from 'lucide-react'

import { userService } from '@/services/user-service'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { ExportExcelButton } from '@/components/export-excel-button'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  // Fetch real users from backend API
  const {
    data: usersResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers({ per_page: 100 }),
  })

  const usersList = usersResponse?.data || []

  // KPI Calculations
  const totalUsers = usersList.length
  const activeUsers = usersList.filter((u) => u.status === 'active').length
  const twoFactorUsers = usersList.filter((u) => u.two_factor_enabled).length
  const pendingUsers = usersList.filter(
    (u) => u.status === 'pending_activation' || u.is_pending_activation
  ).length

  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Pegawai',
      value: totalUsers,
      icon: UsersIcon,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Pegawai Aktif',
      value: activeUsers,
      icon: UserCheck,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Terproteksi 2FA',
      value: twoFactorUsers,
      icon: ShieldCheck,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Menunggu Aktivasi',
      value: pendingUsers,
      icon: MailPlus,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <UsersProvider>
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
              Manajemen Pegawai & Pengguna
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola akun resmi pegawai, penugasan peran jabatan, dan status keamanan autentikasi 2FA.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/users/export'
              params={{
                search: search?.username || search?.status || '',
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
            <UsersPrimaryButtons />
          </div>
        </PageHeader>

        {/* Compact KPI Stats with Skeleton loading */}
        <KpiStatsCards items={kpiItems} isLoading={isLoading} />


        {/* Users Table / Loading State */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>Memuat data pegawai...</p>
          </div>
        ) : (
          <UsersTable data={usersList} search={search} navigate={navigate} />
        )}
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
