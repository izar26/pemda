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
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
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

  return (
    <UsersProvider>
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
              Manajemen Pegawai & Pengguna
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola akun resmi pegawai, penugasan peran jabatan, dan status keamanan autentikasi 2FA.
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
            <UsersPrimaryButtons />
          </div>
        </div>

        {/* Compact KPI Stats (matching Audit Log style) */}
        <div className='grid gap-2.5 grid-cols-2 lg:grid-cols-4'>
          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Total Pegawai</span>
              <p className='text-lg font-bold text-foreground leading-tight'>{totalUsers}</p>
            </div>
            <div className='rounded-md bg-primary/10 p-2 text-primary'>
              <UsersIcon className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Pegawai Aktif</span>
              <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight'>{activeUsers}</p>
            </div>
            <div className='rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
              <UserCheck className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Terproteksi 2FA</span>
              <p className='text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight'>{twoFactorUsers}</p>
            </div>
            <div className='rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
              <ShieldCheck className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Menunggu Aktivasi</span>
              <p className='text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight'>{pendingUsers}</p>
            </div>
            <div className='rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400'>
              <MailPlus className='h-4 w-4' />
            </div>
          </div>
        </div>


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
