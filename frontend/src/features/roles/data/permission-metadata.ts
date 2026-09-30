export type RiskLevel = 'low' | 'medium' | 'critical'

export interface PermissionMetadata {
  label: string
  description: string
  risk: RiskLevel
  badgeLabel: string
}

export const PERMISSION_METADATA: Record<string, PermissionMetadata> = {
  'users.view': {
    label: 'Lihat Pegawai',
    description: 'Melihat daftar ASN/pegawai, NIP, email dinas, dan status akun.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'users.create': {
    label: 'Tambah Pegawai',
    description: 'Membuat akun dinas baru dan menetapkan kredensial awal.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'users.edit': {
    label: 'Edit Pegawai',
    description: 'Mengubah profil, nomor kontak, jabatan, dan status pegawai.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'users.delete': {
    label: 'Hapus Pegawai',
    description: 'Mencabut akun pegawai dan menghapus akses portal secara permanen.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'users.reset_2fa': {
    label: 'Reset 2FA',
    description: 'Mereset kunci 2FA pegawai yang kehilangan perangkat autentikasi.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'roles.view': {
    label: 'Lihat Peran',
    description: 'Melihat konfigurasi peran kedinasan dan pemetaan hak akses.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'roles.create': {
    label: 'Tambah Peran',
    description: 'Menambahkan jabatan fungsional baru ke dalam skema kewenangan.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'roles.edit': {
    label: 'Edit Hak Akses',
    description: 'Mengubah centang kewenangan operasional pada peran terdaftar.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'roles.delete': {
    label: 'Hapus Peran',
    description: 'Menghapus peran kustom yang sudah tidak dipakai oleh pegawai.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'audit.view': {
    label: 'Lihat Log Audit',
    description: 'Memantau riwayat login, aktivitas perubahan data, dan insiden.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'settings.view': {
    label: 'Lihat Pengaturan',
    description: 'Melihat parameter sistem, profil instansi, dan kebijakan portal.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'settings.edit': {
    label: 'Ubah Pengaturan',
    description: 'Mengubah konfigurasi keamanan sistem dan parameter dinas.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'opd.view': {
    label: 'Lihat Perangkat Daerah',
    description: 'Melihat direktori instansi OPD, sekretariat, dinas, badan, RSUD, dan kecamatan.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'opd.create': {
    label: 'Tambah Perangkat Daerah',
    description: 'Mendaftarkan instansi perangkat daerah baru ke dalam portal.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'opd.edit': {
    label: 'Edit Perangkat Daerah',
    description: 'Mengubah nama instansi, kode, kategori, atau nama kepala OPD.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'opd.delete': {
    label: 'Hapus Perangkat Daerah',
    description: 'Menghapus instansi perangkat daerah yang tidak memiliki relasi pegawai.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'master.view': {
    label: 'Lihat Data Master',
    description: 'Melihat tabel data master parameter risiko, tata kelola, dan SPIP.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'master.create': {
    label: 'Tambah Data Master',
    description: 'Menambahkan entri referensi data master baru ke sistem.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'master.edit': {
    label: 'Edit Data Master',
    description: 'Mengubah nama, kode, definisi, atau status aktif data master.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'master.delete': {
    label: 'Hapus Data Master',
    description: 'Menghapus atau menonaktifkan entri data master sistem.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
}

export function getPermissionMetadata(permName: string): PermissionMetadata {
  return (
    PERMISSION_METADATA[permName] || {
      label: permName,
      description: 'Hak akses operasional modul.',
      risk: 'medium',
      badgeLabel: 'Operasional',
    }
  )
}
