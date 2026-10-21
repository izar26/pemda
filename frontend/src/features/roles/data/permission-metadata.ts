export type RiskLevel = 'low' | 'medium' | 'critical'

export interface PermissionMetadata {
  label: string
  description: string
  risk: RiskLevel
  badgeLabel: string
}

export const PERMISSION_METADATA: Record<string, PermissionMetadata> = {
  // 1. Perangkat Daerah / OPD (Fitur 11)
  'opd.view': {
    label: 'Lihat Perangkat Daerah',
    description: 'Melihat direktori instansi dinas, badan, sekretariat, dan kecamatan.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'opd.create': {
    label: 'Tambah Perangkat Daerah',
    description: 'Mendaftarkan instansi perangkat daerah baru ke dalam sistem.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'opd.edit': {
    label: 'Edit Perangkat Daerah',
    description: 'Mengubah nama instansi, kode, kategori, atau nama kepala dinas.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'opd.delete': {
    label: 'Hapus Perangkat Daerah',
    description: 'Menghapus data instansi perangkat daerah dari sistem.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 3. Manajemen Pegawai (Fitur 12)
  'pegawai.view': {
    label: 'Lihat Direktori Pegawai',
    description: 'Melihat daftar biodata pegawai ASN, NIP, jabatan, dan kontak per OPD.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'pegawai.create': {
    label: 'Tambah Data Pegawai',
    description: 'Menambahkan biodata pegawai baru ke instansi perangkat daerah.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'pegawai.edit': {
    label: 'Edit Pegawai & Kepala OPD',
    description: 'Mengubah biodata pegawai, mutasi OPD, serta pergantian jabatan Kepala OPD.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'pegawai.delete': {
    label: 'Hapus Data Pegawai',
    description: 'Menghapus biodata pegawai secara permanen dari direktori instansi.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 3b. Manajemen Users (Fitur 9)
  'users.view': {
    label: 'Lihat Akun Users',
    description: 'Melihat daftar akun login pengguna, peran RBAC, dan status keamanan 2FA.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'users.create': {
    label: 'Buat Akun User',
    description: 'Memberikan akun login, peran (role), dan kata sandi kepada pegawai.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'users.edit': {
    label: 'Edit Akun User',
    description: 'Mengubah peran (role), kata sandi, dan status aktif/nonaktif akun pengguna.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'users.delete': {
    label: 'Cabut Akun User',
    description: 'Mencabut akses login dan peran pengguna tanpa menghapus biodata pegawai.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'users.reset_2fa': {
    label: 'Reset 2FA User',
    description: 'Mereset autentikasi 2 faktor pengguna yang kehilangan perangkat.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 4. Data Master (Fitur 10)
  'master.view': {
    label: 'Lihat Data Master',
    description: 'Melihat tabel referensi master parameter risiko dan tata kelola.',
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
    description: 'Menghapus atau menonaktifkan entri referensi data master.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 5. Peran & Izin (Fitur 8)
  'roles.view': {
    label: 'Lihat Peran & Izin',
    description: 'Melihat konfigurasi peran kedinasan dan pemetaan hak akses.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'roles.create': {
    label: 'Tambah Peran',
    description: 'Menambahkan peran fungsional baru ke dalam skema kewenangan.',
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

  // 6. Periode Penilaian (Fitur 13)
  'periode.view': {
    label: 'Lihat Periode Penilaian',
    description: 'Melihat siklus periode penilaian 5 tahunan RPJMD dan tahun aktif.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'periode.create': {
    label: 'Tambah Periode Penilaian',
    description: 'Menambahkan siklus periode penilaian RPJMD baru.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'periode.edit': {
    label: 'Edit Periode & Tahun Aktif',
    description: 'Mengubah periode penilaian serta mengganti tahun penilaian aktif.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'periode.delete': {
    label: 'Hapus Periode Penilaian',
    description: 'Menghapus periode penilaian yang belum memiliki riwayat penilaian.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 7. Tujuan, Sasaran & Indikator (Fitur 14-17)
  'tujuan.view': {
    label: 'Lihat Tujuan, Sasaran & Indikator',
    description: 'Melihat pohon kinerja Tujuan, Sasaran, dan Indikator (IKU) seluruh perangkat daerah.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'tujuan.create': {
    label: 'Tambah Tujuan, Sasaran & Indikator',
    description: 'Menambahkan rumusan Tujuan, Sasaran, dan Indikator (IKU) pada perangkat daerah.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'tujuan.edit': {
    label: 'Edit & Urutkan Tujuan, Sasaran & Indikator',
    description: 'Mengubah data maupun urutan (drag & drop) Tujuan, Sasaran, dan Indikator (IKU).',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'tujuan.delete': {
    label: 'Hapus Tujuan, Sasaran & Indikator',
    description: 'Menghapus item Tujuan, Sasaran, atau Indikator dari pohon kinerja.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'tujuan.copy': {
    label: 'Salin dari Periode Lain',
    description: 'Menyalin pohon Tujuan, Sasaran, dan Indikator dari periode penilaian sebelumnya.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },

  // 8. Sasaran Renstra OPD (Fitur 15)
  'sasaran.view': {
    label: 'Lihat Sasaran Renstra OPD',
    description: 'Melihat daftar sasaran strategis Renstra dan cascading tujuan.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'sasaran.create': {
    label: 'Tambah Sasaran Renstra',
    description: 'Menambahkan rumusan sasaran strategis Renstra yang terkait tujuan.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'sasaran.edit': {
    label: 'Edit Sasaran Renstra',
    description: 'Mengubah narasi pernyataan, kode sasaran, atau penugasan tujuan.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'sasaran.delete': {
    label: 'Hapus Sasaran Renstra',
    description: 'Menghapus sasaran strategis yang belum terhubung dengan indikator.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'sasaran.copy': {
    label: 'Salin Sasaran dari Periode Lain',
    description: 'Menyalin massal sasaran strategis dari periode penilaian sebelumnya.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },

  // 9. Indikator & IKU Renstra OPD (Fitur 16 & 17)
  'iku.view': {
    label: 'Lihat IKU & Indikator Renstra',
    description: 'Melihat daftar IKU dan indikator sasaran Renstra seluruh perangkat daerah.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'iku.create': {
    label: 'Tambah IKU & Indikator',
    description: 'Menambahkan rumusan IKU atau indikator sasaran Renstra baru.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'iku.edit': {
    label: 'Edit IKU & Indikator',
    description: 'Mengubah rumusan indikator atau IKU Renstra perangkat daerah.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'iku.delete': {
    label: 'Hapus IKU & Indikator',
    description: 'Menghapus rumusan indikator atau IKU dari pohon cascading kinerja.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'iku.copy': {
    label: 'Salin IKU dari Periode Lain',
    description: 'Menyalin massal IKU dan indikator Renstra dari periode penilaian sebelumnya.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },

  // 10. Konteks Risiko Strategis OPD (Fitur 26 - Form 2B)
  'konteks_risiko.view': {
    label: 'Lihat Konteks Risiko Strategis',
    description: 'Melihat penetapan konteks risiko strategis perangkat daerah (Form 2B).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'konteks_risiko.create': {
    label: 'Tetapkan Konteks Risiko Strategis',
    description: 'Menetapkan ruang lingkup tujuan, sasaran, dan IKU risiko strategis OPD baru.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_risiko.edit': {
    label: 'Edit Konteks Risiko Strategis',
    description: 'Mengubah pilihan sasaran, IKU, sumber data, atau catatan konteks risiko OPD.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_risiko.delete': {
    label: 'Hapus Konteks Risiko Strategis',
    description: 'Menghapus penetapan konteks risiko strategis OPD tahun berjalan.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'konteks_risiko.export': {
    label: 'Ekspor / Cetak Form 2B',
    description: 'Mengekspor atau mengunduh formulir penetapan konteks risiko strategis ke format Excel.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 11. Konteks Risiko Operasional OPD (Fitur 26 - Form 2C)
  'konteks_operasional.view': {
    label: 'Lihat Konteks Risiko Operasional',
    description: 'Melihat penetapan konteks risiko operasional OPD tingkat Program, Kegiatan, dan Sub-Kegiatan (Form 2C).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'konteks_operasional.create': {
    label: 'Tetapkan Konteks Risiko Operasional',
    description: 'Menetapkan ruang lingkup program, kegiatan, sub-kegiatan, dan target risiko operasional OPD baru.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_operasional.edit': {
    label: 'Edit Konteks Risiko Operasional',
    description: 'Mengubah rincian program, kegiatan, sub-kegiatan, target, atau status penetapan risiko operasional.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_operasional.delete': {
    label: 'Hapus Konteks Risiko Operasional',
    description: 'Menghapus penetapan konteks risiko operasional OPD tahun berjalan.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'konteks_operasional.export': {
    label: 'Ekspor / Cetak Form 2C',
    description: 'Mengekspor atau mengunduh formulir penetapan konteks risiko operasional ke format Excel.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 12. Log Audit Keamanan (Fitur 5)
  'audit.view': {
    label: 'Lihat Log Audit',
    description: 'Memantau rekaman jejak audit, aktivitas pengguna, dan log keamanan.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'audit.export': {
    label: 'Ekspor Log Audit',
    description: 'Mengekspor rekaman jejak audit aktivitas ke berkas Excel.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'audit.purge': {
    label: 'Bersihkan Arsip Log',
    description: 'Membersihkan rekaman log audit yang telah melampaui masa retensi.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 9. Banner Login & Publik (CMS)
  'content.view': {
    label: 'Lihat Banner Portal',
    description: 'Melihat galeri banner informasi login dan pengumuman publik.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'content.create': {
    label: 'Tambah Banner Portal',
    description: 'Mengunggah banner baru untuk halaman masuk atau portal publik.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'content.edit': {
    label: 'Edit Banner Portal',
    description: 'Mengubah status tayang dan mengatur urutan prioritas banner.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'content.delete': {
    label: 'Hapus Banner Portal',
    description: 'Menghapus gambar dan materi publikasi banner dari sistem.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 10. Pengaturan Sistem (Fitur 7)
  'settings.view': {
    label: 'Lihat Pengaturan Sistem',
    description: 'Melihat konfigurasi parameter sistem, profil instansi, dan modul.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'settings.edit': {
    label: 'Ubah Pengaturan Sistem',
    description: 'Mengubah konfigurasi keamanan sistem, batas sesi, dan parameter dinas.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 11. Pelaporan & Dokumen (Fitur 26 & 31)
  'laporan.view': {
    label: 'Lihat Laporan Risiko OPD',
    description: 'Melihat lembar formulir resmi dan pusat laporan risiko OPD.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'laporan.export': {
    label: 'Ekspor Laporan Risiko OPD',
    description: 'Mengekspor laporan risiko ke berkas Excel (.xlsx) dan Cetak PDF.',
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

