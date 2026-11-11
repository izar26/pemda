import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  UserCog,
  Shield,
  Landmark,
  History,
  Sliders,
  Database,
  Building2,
  Images,
  CalendarRange,
  Target,
  ShieldAlert,
  FolderTree,
  FileSpreadsheet,
  GitFork,
  FolderKanban,
  UserCheck,
  ClipboardCheck,
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
          title: 'Perangkat Daerah',
          url: '/opd',
          icon: Building2,
          requiredPermission: 'opd.view',
        },
        {
          title: 'Manajemen Pegawai',
          url: '/pegawai',
          icon: Users,
          requiredPermission: 'pegawai.view',
        },
        {
          title: 'Manajemen Hak Akses',
          url: '/roles',
          icon: ShieldCheck,
          requiredPermission: 'roles.view',
        },
        {
          title: 'Manajemen Users',
          url: '/users',
          icon: UserCog,
          requiredPermission: 'users.view',
        },
      ],
    },
    {
      title: 'Perencanaan Kinerja',
      items: [
        {
          title: 'Data Master',
          url: '/master-data',
          icon: Database,
          requiredPermission: 'master.view',
        },
        {
          title: 'Periode Penilaian',
          url: '/perencanaan/periode',
          icon: CalendarRange,
          requiredPermission: 'periode.view',
        },
        {
          title: 'Tujuan, Sasaran & Indikator',
          url: '/perencanaan/tujuan',
          icon: Target,
          requiredPermission: 'tujuan.view',
        },
      ],
    },
    {
      title: 'Pengawasan & Review',
      items: [
        {
          title: 'Penugasan Auditor',
          url: '/pengawasan/penugasan-auditor',
          icon: UserCheck,
          requiredPermission: 'penugasan_auditor.view',
        },
        {
          title: 'Review Risiko',
          url: '/pengawasan/review-risiko',
          icon: ClipboardCheck,
          requiredPermission: 'review_risiko.view',
        },
      ],
    },
    {
      title: 'Pengelolaan Risiko',
      items: [
        {
          title: 'Konteks Strategis (2B)',
          url: '/risiko/konteks-strategis',
          icon: ShieldAlert,
          requiredPermission: 'konteks_risiko.view',
        },
        {
          title: 'Konteks Operasional (2C)',
          url: '/risiko/konteks-operasional',
          icon: FolderTree,
          requiredPermission: 'konteks_operasional.view',
        },
        {
          title: 'Identifikasi Pemda (3A)',
          url: '/risiko/identifikasi-pemda',
          icon: Landmark,
          requiredPermission: 'identifikasi_risiko_pemda.view',
        },
        {
          title: 'Identifikasi OPD (3B)',
          url: '/risiko/identifikasi-opd',
          icon: Building2,
          requiredPermission: 'identifikasi_risiko_opd.view',
        },
        {
          title: 'Identifikasi Operasional (3C)',
          url: '/risiko/identifikasi-operasional',
          icon: FolderKanban,
          requiredPermission: 'identifikasi_risiko_opd_operasional.view',
        },
        {
          title: 'Root Cause Analysis (RCA)',
          url: '/risiko/rca',
          icon: GitFork,
          requiredPermission: 'rca.view',
        },
        {
          title: 'Analisis Risiko (4)',
          url: '/risiko/analisis-risiko',
          icon: ClipboardCheck,
          requiredPermission: 'identifikasi_risiko_opd.view',
        },
      ],
    },
    {
      title: 'Pelaporan & Dokumen',
      items: [
        {
          title: 'Laporan Risiko OPD',
          url: '/laporan',
          icon: FileSpreadsheet,
          requiredPermission: 'konteks_risiko.view',
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
      ],
    },
    {
      title: 'Manajemen Konten',
      items: [
        {
          title: 'Banner Login & Publik',
          url: '/content-management/banners',
          icon: Images,
          requiredPermission: 'content.view',
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
          ],
        },
      ],
    },
  ],
}

