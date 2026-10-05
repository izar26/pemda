import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  UserCog,
  Shield,
  Palette,
  Bell,
  Monitor,
  Landmark,
  History,
  Sliders,
  Database,
  Building2,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Administrator',
    email: 'admin@pemda.go.id',
    avatar: '',
  },
  teams: [
    {
      name: 'Portal PEMDA',
      logo: Landmark,
      plan: 'Pemerintah Daerah',
    },
  ],
  navGroups: [
    {
      title: 'Menu Utama',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Perangkat Daerah (OPD)',
          url: '/opd',
          icon: Building2,
          requiredPermission: 'opd.view',
        },
        {
          title: 'Manajemen Pegawai',
          url: '/users',
          icon: Users,
          requiredPermission: 'users.view',
        },
        {
          title: 'Data Master',
          url: '/master-data',
          icon: Database,
          requiredPermission: 'master.view',
        },
        {
          title: 'Peran & Izin',
          url: '/roles',
          icon: ShieldCheck,
          requiredPermission: 'roles.view',
        },
        {
          title: 'Log Audit Keamanan',
          url: '/audit-logs',
          icon: History,
          requiredPermission: 'audit.view',
        },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        {
          title: 'Pengaturan Sistem',
          url: '/system-settings',
          icon: Sliders,
          requiredPermission: 'settings.view',
        },
        {
          title: 'Pengaturan Akun',
          icon: Settings,
          items: [
            {
              title: 'Profil Pengguna',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Keamanan Akun',
              url: '/settings/account',
              icon: Shield,
            },
            {
              title: 'Tema & Tampilan',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifikasi',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Layar & Tampilan',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
}
