export const moduleFilterOptions = [
  { label: 'Autentikasi', value: 'Autentikasi' },
  { label: 'Pegawai', value: 'Pegawai' },
  { label: 'Profil Akun', value: 'Profil' },
  { label: 'Organisasi (OPD)', value: 'Organisasi (OPD)' },
  { label: 'Peran & Izin', value: 'Peran & Izin' },
  { label: 'Master Data', value: 'Master Data' },
  { label: 'Pengaturan Sistem', value: 'Pengaturan Sistem' },
]

export const actionBadgeMap: Record<
  string,
  { label: string; className: string }
> = {
  // Authentication Actions
  AUTH_LOGIN_SUCCESS: {
    label: 'Login Berhasil',
    className:
      'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300',
  },
  AUTH_LOGIN_FAILED: {
    label: 'Login Gagal',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  AUTH_ACCOUNT_LOCKED: {
    label: 'Akun Terkunci',
    className:
      'border-rose-400 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
  },
  AUTH_LOGIN_BLOCKED: {
    label: 'Login Ditolak',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  AUTH_2FA_FAILED: {
    label: '2FA Gagal',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  AUTH_2FA_CHALLENGE: {
    label: 'Tantangan 2FA',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },
  AUTH_2FA_ENABLED: {
    label: '2FA Diaktifkan',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  AUTH_2FA_DISABLED: {
    label: '2FA Dinonaktifkan',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  },
  AUTH_2FA_RECOVERY_REGENERATED: {
    label: 'Regenerasi 2FA',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },
  AUTH_LOGOUT: {
    label: 'Keluar (Logout)',
    className:
      'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300',
  },
  AUTH_LOGOUT_ALL: {
    label: 'Logout Semua Sesi',
    className:
      'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300',
  },
  AUTH_PASSWORD_RESET: {
    label: 'Reset Kata Sandi',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  },
  AUTH_PASSWORD_RESET_REQUESTED: {
    label: 'Permintaan Reset',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },

  // User Lifecycle Actions
  USER_CREATE: {
    label: 'Tambah Pegawai',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  USER_UPDATE: {
    label: 'Ubah Pegawai',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },
  USER_DELETE: {
    label: 'Hapus Pegawai',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  USER_RESTORE: {
    label: 'Pulihkan Pegawai',
    className:
      'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300',
  },
  USER_INVITE: {
    label: 'Undang Pegawai',
    className:
      'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300',
  },
  USER_INVITE_RESEND: {
    label: 'Kirim Ulang Undangan',
    className:
      'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300',
  },
  USER_ACTIVATED: {
    label: 'Aktivasi Akun',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  USER_RESET_2FA: {
    label: 'Reset 2FA',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  },
  USER_PROFILE_UPDATE: {
    label: 'Ubah Profil',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },

  // OPD Actions
  OPD_CREATE: {
    label: 'Tambah OPD',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  OPD_UPDATE: {
    label: 'Ubah OPD',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },
  OPD_DELETE: {
    label: 'Hapus OPD',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  OPD_RESTORE: {
    label: 'Pulihkan OPD',
    className:
      'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300',
  },

  // Role Actions
  ROLE_CREATE: {
    label: 'Tambah Peran',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  ROLE_UPDATE: {
    label: 'Ubah Peran',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },
  ROLE_DELETE: {
    label: 'Hapus Peran',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  ROLE_PERMISSIONS_UPDATED: {
    label: 'Ubah Izin Peran',
    className:
      'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300',
  },

  // Master Data Actions
  MASTER_DATA_CREATE: {
    label: 'Tambah Master',
    className:
      'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300',
  },
  MASTER_DATA_UPDATE: {
    label: 'Ubah Master',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  },
  MASTER_DATA_DELETE: {
    label: 'Hapus Master',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  MASTER_DATA_TOGGLE: {
    label: 'Ubah Status',
    className:
      'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300',
  },

  // System Settings Actions
  SYSTEM_SETTING_CREATE: {
    label: 'Tambah Pengaturan',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  },
  SYSTEM_SETTING_UPDATE: {
    label: 'Ubah Pengaturan',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  },
  SYSTEM_SETTING_DELETE: {
    label: 'Hapus Pengaturan',
    className:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  },
  SETTINGS_UPDATE: {
    label: 'Ubah Pengaturan',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  },

  // Generic Fallback Actions
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

export function getActionBadgeConfig(action: string): {
  label: string
  className: string
} {
  const upper = (action || '').toUpperCase()
  if (actionBadgeMap[upper]) {
    return actionBadgeMap[upper]
  }

  // Dynamic heuristic fallback
  if (upper.endsWith('_CREATE') || upper.endsWith('_CREATED')) {
    return {
      label: 'Tambah',
      className:
        'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
    }
  }
  if (upper.endsWith('_UPDATE') || upper.endsWith('_UPDATED')) {
    return {
      label: 'Ubah',
      className:
        'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
    }
  }
  if (upper.endsWith('_DELETE') || upper.endsWith('_DELETED')) {
    return {
      label: 'Hapus',
      className:
        'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
    }
  }
  if (upper.endsWith('_RESTORE') || upper.endsWith('_RESTORED')) {
    return {
      label: 'Pulihkan',
      className:
        'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300',
    }
  }

  return {
    label: upper.replace(/_/g, ' '),
    className: 'border-muted-foreground/30 bg-muted/40 text-foreground',
  }
}
