export const moduleFilterOptions = [
  { label: 'Autentikasi', value: 'Autentikasi' },
  { label: 'Pegawai', value: 'Pegawai' },
  { label: 'Organisasi (OPD)', value: 'Organisasi (OPD)' },
  { label: 'Peran & Izin', value: 'Peran & Izin' },
  { label: 'Master Data', value: 'Master Data' },
  { label: 'Pengaturan Sistem', value: 'Pengaturan Sistem' },
]

export const actionBadgeMap: Record<
  string,
  { label: string; className: string }
> = {
  CREATE: {
    label: 'Tambah',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  UPDATE: {
    label: 'Ubah',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },
  DELETE: {
    label: 'Hapus',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  LOGIN: {
    label: 'Masuk (Login)',
    className:
      'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300',
  },
  LOGOUT: {
    label: 'Keluar (Logout)',
    className:
      'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300',
  },
  PASSWORD_RESET: {
    label: 'Reset Kata Sandi',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  },
  STATUS_CHANGE: {
    label: 'Ubah Status',
    className:
      'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300',
  },
}
