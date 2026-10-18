import { Outlet } from '@tanstack/react-router'
import { Palette, ShieldCheck, UserCog } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

const sidebarNavItems = [
  {
    title: 'Profil Pengguna',
    href: '/settings',
    icon: <UserCog size={18} />,
  },
  {
    title: 'Keamanan Akun',
    href: '/settings/account',
    icon: <ShieldCheck size={18} />,
  },
  {
    title: 'Tema & Tampilan',
    href: '/settings/appearance',
    icon: <Palette size={18} />,
  },
]

export function Settings() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <PageHeader className='space-y-0.5'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground'>
            Pengaturan Akun & Preferensi
          </h2>
          <p className='text-xs text-muted-foreground'>
            Kelola profil kedinasan, keamanan kata sandi, autentikasi dua faktor (2FA), serta preferensi tampilan aplikasi Anda.
          </p>
        </PageHeader>
        <div className='mt-3 flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
