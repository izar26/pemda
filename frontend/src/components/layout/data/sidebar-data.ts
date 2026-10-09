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
  Calendar,
  GitFork,
  Layers,
  Target,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
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
      name: 'Aplikasi ManRis',
      logo: Landmark,
      plan: 'Manajemen Risiko PEMDA',
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
      ],
    },
    {
      title: 'Perencanaan Kinerja',
      items: [
        {
          title: 'Perencanaan Kinerja',
          icon: GitFork,
          requiredPermission: 'perencanaan.view',
          items: [
            {
              title: 'Periode Penilaian',
              badge: 'Fitur 13',
              url: '/perencanaan/periode',
              icon: Calendar,
              requiredPermission: 'perencanaan.periode',
            },
            {
              title: 'Data Tujuan',
              badge: 'Fitur 14',
              url: '/perencanaan/cascading?tab=tujuan',
              icon: Target,
              requiredPermission: 'perencanaan.cascading',
            },
            {
              title: 'Data Sasaran',
              badge: 'Fitur 15',
              url: '/perencanaan/cascading?tab=sasaran',
              icon: GitFork,
              requiredPermission: 'perencanaan.cascading',
            },
            {
              title: 'Data IKU',
              badge: 'Fitur 16',
              url: '/perencanaan/cascading?tab=iku',
              icon: Sparkles,
              requiredPermission: 'perencanaan.cascading',
            },
            {
              title: 'Data Indikator',
              badge: 'Fitur 17',
              url: '/perencanaan/cascading?tab=indikator',
              icon: Layers,
              requiredPermission: 'perencanaan.cascading',
            },
          ],
        },
      ],
    },
    {
      title: 'Pengelolaan Risiko (OPD)',
      items: [
        {
          title: 'Pengelolaan Risiko',
          icon: ShieldAlert,
          requiredPermission: 'risiko.view',
          items: [
            {
              title: 'Konteks Strategis',
              badge: 'Sheet 2B',
              url: '/perencanaan/konteks-strategis',
              icon: Target,
              requiredPermission: 'risiko.konteks',
            },
            {
              title: 'Konteks Operasional (Renstra)',
              badge: 'Sheet 2C',
              url: '/perencanaan/renstra',
              icon: FileSpreadsheet,
              requiredPermission: 'risiko.konteks',
            },
          ],
        },
      ],
    },
    {
      title: 'Keamanan & Sistem',
      items: [
        {
          title: 'Log Audit Keamanan',
          url: '/audit-logs',
          icon: History,
          requiredPermission: 'audit.view',
        },
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
