export type RiskLevel = 'low' | 'medium' | 'critical'

export interface PermissionMetadata {
  label: string
  description: string
  risk: RiskLevel
  badgeLabel: string
}

export const PERMISSION_METADATA: Record<string, PermissionMetadata> = {
  // Pengguna & Kepegawaian (Fitur 9 & 12)
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

  // Peran & Izin (Fitur 8)
  'roles.view': {
    label: 'Lihat Peran & Izin',
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
    label: 'Edit Matriks Hak Akses',
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

  // Log Audit & Keamanan (Fitur 5)
  'audit.view': {
    label: 'Lihat Log Audit',
    description: 'Memantau riwayat login, aktivitas perubahan data, dan log keamanan.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // Pengaturan Sistem (Fitur 7)
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

  // Perangkat Daerah / OPD (Fitur 11)
  'opd.view': {
    label: 'Lihat Perangkat Daerah',
    description: 'Melihat direktori instansi OPD, sekretariat, dinas, badan, dan kecamatan.',
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

  // Master Data (Fitur 10)
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

  // Perencanaan Kinerja Bapperida (Fitur 13-17)
  'perencanaan.view': {
    label: 'Lihat Perencanaan Kinerja',
    description: 'Melihat jadwal periode penilaian, sasaran makro, dan Renstra daerah.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'perencanaan.periode': {
    label: 'Kelola Periode Penilaian (Fitur 13)',
    description: 'Menetapkan siklus periode 5 tahunan, tahun penilaian aktif, dan masa berlaku.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'perencanaan.cascading': {
    label: 'Kelola Cascading Kinerja (Fitur 14-17)',
    description: 'Mengelola pohon kinerja Tujuan, Sasaran, IKU, dan Indikator Makro Pemda.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'perencanaan.renstra': {
    label: 'Selaraskan Renstra SKPD',
    description: 'Menyelaraskan pohon program, kegiatan, dan sub kegiatan antar-OPD.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },

  // Pengelolaan Data Risiko OPD (Fitur 26-30, 33)
  'risiko.view': {
    label: 'Lihat Data Risiko OPD',
    description: 'Melihat formulir dan registrasi data risiko pada perangkat daerah.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'risiko.konteks': {
    label: 'Kelola Konteks Risiko (Form 2B & 2C)',
    description: 'Menetapkan Konteks Risiko Strategis (Form 2B) & Konteks Operasional (Form 2C).',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'risiko.penilaian': {
    label: 'Penilaian Risiko Form 3-10 & RCA',
    description: 'Melakukan identifikasi, analisis kemungkinan & dampak, serta evaluasi risiko OPD.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'risiko.rtp': {
    label: 'Rencana Tindak Pengendalian / RTP (Fitur 27)',
    description: 'Menyusun rencana tindakan pengendalian dan perlakuan atas risiko.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'risiko.kejadian': {
    label: 'Pencatatan Kejadian Risiko (Fitur 28)',
    description: 'Mendokumentasikan insiden / keterjadian risiko riil di unit kerja.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'risiko.pengendalian': {
    label: 'Pemantauan Pengendalian (Fitur 29)',
    description: 'Memantau efektivitas kegiatan pengendalian yang telah berjalan.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'risiko.fraud': {
    label: 'Penilaian Risiko Kecurangan (Fitur 30)',
    description: 'Mengidentifikasi potensi fraud/kecurangan pada program perangkat daerah.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'risiko.import': {
    label: 'Import Data Risiko Excel (Fitur 33)',
    description: 'Mengunggah massal data rencana program dan risiko melalui format spreadsheet.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },

  // Pengawasan & Audit APIP (Fitur 18-25)
  'pengawasan.view': {
    label: 'Pengawasan, Survei & SPIP (Fitur 18-22)',
    description: 'Mengakses instrumen survei, monev, data wilayah, dan form SPIP (1b, 1c, 2a, 3a).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'audit_spip.view': {
    label: 'Audit & Riviu Risiko (Fitur 23-25)',
    description: 'Melakukan audit risiko, menyusun rekomendasi perbaikan, dan memantau tindak lanjut.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },

  // Laporan & Arsip (Fitur 31 & 32)
  'laporan.view': {
    label: 'Laporan & Ekspor Risiko (Fitur 31)',
    description: 'Mencetak dan mengekspor dokumen resmi laporan manajemen risiko.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'arsip.view': {
    label: 'Arsip Penilaian Risiko (Fitur 32)',
    description: 'Melihat berkas arsip dan catatan historis penilaian periode lampau.',
    risk: 'low',
    badgeLabel: 'Aman',
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
