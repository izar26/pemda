export type RiskLevel = 'low' | 'medium' | 'critical'

export interface PermissionMetadata {
  label: string
  description: string
  risk: RiskLevel
  badgeLabel: string
}

export interface NavCategoryDefinition {
  id: string
  name: string
  sortOrder: number
  modules: string[]
}

/**
 * Single Source of Truth for Sidebar Navigation Categories & Module Hierarchy.
 * Keeps the RBAC matrix and role edit dialog 100% aligned with the Sidebar structure.
 */
export const NAV_CATEGORIES: NavCategoryDefinition[] = [
  {
    id: 'menu-utama',
    name: 'Menu Utama',
    sortOrder: 1,
    modules: [
      'Perangkat Daerah',
      'Manajemen Pegawai',
      'Manajemen Hak Akses',
      'Manajemen Users',
    ],
  },
  {
    id: 'perencanaan-kinerja',
    name: 'Perencanaan Kinerja',
    sortOrder: 2,
    modules: [
      'Data Master',
      'Periode Penilaian',
      'Tujuan, Sasaran & Indikator',
    ],
  },
  {
    id: 'pengawasan-review',
    name: 'Pengawasan & Review',
    sortOrder: 3,
    modules: ['Penugasan Auditor', 'Review Risiko'],
  },
  {
    id: 'pengelolaan-risiko',
    name: 'Pengelolaan Risiko',
    sortOrder: 4,
    modules: [
      'Konteks Strategis (2B)',
      'Konteks Operasional (2C)',
      'Identifikasi Pemda (3A)',
      'Identifikasi OPD (3B - 10 & FRA)',
      'Identifikasi Operasional (3C)',
      'Root Cause Analysis (RCA)',
    ],
  },
  {
    id: 'pelaporan-dokumen',
    name: 'Pelaporan & Dokumen',
    sortOrder: 5,
    modules: ['Laporan Risiko OPD'],
  },
  {
    id: 'keamanan-sistem',
    name: 'Keamanan & Sistem',
    sortOrder: 6,
    modules: ['Log Audit Keamanan'],
  },
  {
    id: 'manajemen-konten',
    name: 'Manajemen Konten',
    sortOrder: 7,
    modules: ['Banner Login & Publik'],
  },
  {
    id: 'pengaturan',
    name: 'Pengaturan',
    sortOrder: 8,
    modules: ['Pengaturan Sistem'],
  },
]

export function getCategoryForModule(moduleName: string): string {
  for (const cat of NAV_CATEGORIES) {
    if (cat.modules.includes(moduleName)) {
      return cat.name
    }
  }
  return 'Lainnya'
}

export function getModuleSortOrder(moduleName: string): number {
  let index = 0
  for (const cat of NAV_CATEGORIES) {
    for (const mod of cat.modules) {
      index++
      if (mod === moduleName) {
        return index
      }
    }
  }
  return 999
}

export const PERMISSION_METADATA: Record<string, PermissionMetadata> = {
  // 1. Perangkat Daerah (Menu Utama)
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

  // 2. Manajemen Pegawai (Menu Utama)
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

  // 3. Manajemen Hak Akses (Menu Utama)
  'roles.view': {
    label: 'Lihat Hak Akses',
    description: 'Melihat konfigurasi peran kedinasan dan pemetaan hak akses.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'roles.create': {
    label: 'Tambah Peran Baru',
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
    label: 'Hapus Peran Kustom',
    description: 'Menghapus peran kustom yang sudah tidak dipakai oleh pegawai.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 4. Manajemen Users (Menu Utama)
  'users.view': {
    label: 'Lihat Akun Pengguna',
    description: 'Melihat daftar akun login pengguna, peran RBAC, dan status keamanan 2FA.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'users.create': {
    label: 'Buat Akun Login',
    description: 'Memberikan akun login, peran (role), dan kata sandi kepada pegawai.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'users.edit': {
    label: 'Edit Akun Pengguna',
    description: 'Mengubah peran (role), kata sandi, dan status aktif/nonaktif akun pengguna.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'users.delete': {
    label: 'Cabut Akun Pengguna',
    description: 'Mencabut akses login dan peran pengguna tanpa menghapus biodata pegawai.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'users.reset_2fa': {
    label: 'Reset Google 2FA',
    description: 'Mereset autentikasi dua faktor pengguna yang kehilangan perangkat.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 5. Data Master (Perencanaan Kinerja)
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

  // 6. Periode Penilaian (Perencanaan Kinerja)
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

  // 7. Tujuan, Sasaran & Indikator (Perencanaan Kinerja)
  'tujuan.view': {
    label: 'Lihat Pohon Kinerja',
    description: 'Melihat pohon kinerja Tujuan, Sasaran, dan Indikator (IKU) seluruh perangkat daerah.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'tujuan.create': {
    label: 'Tambah Tujuan/Sasaran/IKU',
    description: 'Menambahkan rumusan Tujuan, Sasaran, dan Indikator (IKU) pada perangkat daerah.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'tujuan.edit': {
    label: 'Edit & Urutkan Pohon Kinerja',
    description: 'Mengubah data maupun urutan Tujuan, Sasaran, dan Indikator (IKU).',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'tujuan.delete': {
    label: 'Hapus Pohon Kinerja',
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

  // 8. Penugasan Auditor (Pengawasan & Review)
  'penugasan_auditor.view': {
    label: 'Lihat Penugasan Auditor',
    description: 'Melihat direktori penugasan auditor pengawas ke instansi perangkat daerah.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'penugasan_auditor.create': {
    label: 'Tetapkan Penugasan Auditor',
    description: 'Menugaskan auditor pengawas untuk melakukan pembinaan dan review OPD binaan.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'penugasan_auditor.edit': {
    label: 'Edit Penugasan Auditor',
    description: 'Mengubah cakupan instansi binaan auditor, nomor surat tugas, atau periode penugasan.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'penugasan_auditor.delete': {
    label: 'Cabut Penugasan Auditor',
    description: 'Mencabut penugasan pembinaan auditor dari suatu perangkat daerah.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 9. Review Risiko (Pengawasan & Review)
  'penilaian_risiko.submit': {
    label: 'Ajukan Review Risiko',
    description: 'Mengajukan lembar kerja pengelolaan risiko OPD untuk ditinjau oleh Auditor Pengawas.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'review_risiko.view': {
    label: 'Lihat Pengajuan Review',
    description: 'Melihat daftar dan status pengajuan lembar kerja risiko OPD binaan.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'review_risiko.approve': {
    label: 'Persetujuan / Catatan Revisi',
    description: 'Melakukan persetujuan atau penolakan per-form risiko beserta catatan revisi.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'review_risiko.review_kepala': {
    label: 'Persetujuan Kepala OPD',
    description: 'Memeriksa dan menyetujui lembar kerja risiko internal OPD tingkat Kepala OPD.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'review_risiko.review_pengawas': {
    label: 'Pengesahan Akhir APIP',
    description: 'Memeriksa dan mengesahkan lembar kerja risiko tingkat akhir Pengawas APIP (Inspektorat).',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 10. Konteks Strategis (2B) (Pengelolaan Risiko)
  'konteks_risiko.view': {
    label: 'Lihat Konteks Strategis (2B)',
    description: 'Melihat penetapan konteks risiko strategis perangkat daerah (Form 2B).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'konteks_risiko.create': {
    label: 'Tetapkan Konteks Strategis',
    description: 'Menetapkan ruang lingkup tujuan, sasaran, dan IKU risiko strategis OPD baru.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_risiko.edit': {
    label: 'Edit Konteks Strategis',
    description: 'Mengubah pilihan sasaran, IKU, sumber data, atau catatan konteks risiko OPD.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_risiko.delete': {
    label: 'Hapus Konteks Strategis',
    description: 'Menghapus penetapan konteks risiko strategis OPD tahun berjalan.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'konteks_risiko.export': {
    label: 'Ekspor Form 2B',
    description: 'Mengekspor atau mengunduh formulir penetapan konteks risiko strategis ke Excel.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 11. Konteks Operasional (2C) (Pengelolaan Risiko)
  'konteks_operasional.view': {
    label: 'Lihat Konteks Operasional (2C)',
    description: 'Melihat penetapan konteks risiko operasional OPD tingkat Program & Kegiatan (Form 2C).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'konteks_operasional.create': {
    label: 'Tetapkan Konteks Operasional',
    description: 'Menetapkan ruang lingkup program, kegiatan, sub-kegiatan, dan target risiko operasional baru.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_operasional.edit': {
    label: 'Edit Konteks Operasional',
    description: 'Mengubah rincian program, kegiatan, target, atau status penetapan risiko operasional.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'konteks_operasional.delete': {
    label: 'Hapus Konteks Operasional',
    description: 'Menghapus penetapan konteks risiko operasional OPD tahun berjalan.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'konteks_operasional.export': {
    label: 'Ekspor Form 2C',
    description: 'Mengekspor atau mengunduh formulir penetapan konteks risiko operasional ke Excel.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 12. Identifikasi Pemda (3A) (Pengelolaan Risiko)
  'identifikasi_risiko_pemda.view': {
    label: 'Lihat Identifikasi Pemda (3A)',
    description: 'Melihat lembar identifikasi risiko strategis tingkat Pemerintah Daerah (Form 3A).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'identifikasi_risiko_pemda.create': {
    label: 'Tambah Risiko Pemda',
    description: 'Menambahkan entri identifikasi risiko strategis Pemda baru.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'identifikasi_risiko_pemda.edit': {
    label: 'Edit Risiko Pemda',
    description: 'Mengubah narasi pernyataan, penyebab, dan dampak risiko strategis Pemda.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'identifikasi_risiko_pemda.delete': {
    label: 'Hapus Risiko Pemda',
    description: 'Menghapus risiko strategis Pemda dari lembar kerja Form 3A.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'identifikasi_risiko_pemda.export': {
    label: 'Ekspor Form 3A',
    description: 'Mengekspor berkas Form 3A ke Excel dan cetak PDF.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 13. Identifikasi OPD (3B - 10 & FRA) (Pengelolaan Risiko)
  'identifikasi_risiko_opd.view': {
    label: 'Lihat Risiko OPD (Form 3B-10 & FRA)',
    description: 'Melihat Form 3B dan seluruh rangkaian formulir turunan risiko (Form 4, 5, 6, 7, 8, 9, 10, dan FRA).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'identifikasi_risiko_opd.create': {
    label: 'Tambah Data Risiko OPD',
    description: 'Menambahkan entri risiko strategis OPD baru pada register Form 3B s/d 10.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'identifikasi_risiko_opd.edit': {
    label: 'Edit Register Risiko OPD',
    description: 'Mengubah formulir identifikasi, analisis kemungkinan/dampak, dan tindak pengendalian.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'identifikasi_risiko_opd.delete': {
    label: 'Hapus Risiko OPD',
    description: 'Menghapus data risiko OPD dari register risiko.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'identifikasi_risiko_opd.export': {
    label: 'Ekspor Form 3B-10 & FRA',
    description: 'Mengekspor atau mencetak berkas lembar kerja risiko OPD ke Excel/PDF.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 14. Identifikasi Operasional (3C) (Pengelolaan Risiko)
  'identifikasi_risiko_opd_operasional.view': {
    label: 'Lihat Identifikasi Operasional (3C)',
    description: 'Melihat identifikasi risiko operasional tingkat kegiatan OPD (Form 3C).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'identifikasi_risiko_opd_operasional.create': {
    label: 'Tambah Risiko Operasional',
    description: 'Menambahkan entri risiko operasional OPD baru pada Form 3C.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'identifikasi_risiko_opd_operasional.edit': {
    label: 'Edit Risiko Operasional',
    description: 'Mengubah uraian risiko operasional, pengendalian, dan dampak.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'identifikasi_risiko_opd_operasional.delete': {
    label: 'Hapus Risiko Operasional',
    description: 'Menghapus data risiko operasional OPD dari lembar kerja Form 3C.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },
  'identifikasi_risiko_opd_operasional.export': {
    label: 'Ekspor Form 3C',
    description: 'Mengekspor berkas identifikasi risiko operasional OPD ke Excel.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 15. Root Cause Analysis (RCA) (Pengelolaan Risiko)
  'rca.view': {
    label: 'Lihat Analisis RCA',
    description: 'Melihat analisis akar penyebab masalah metode 5-Whys dan pengendalian (Form RCA).',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'rca.edit': {
    label: 'Isi & Edit Analisis RCA',
    description: 'Mengisi dan memperbarui formulir 5-Whys dan rencana kegiatan pengendalian.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'rca.export': {
    label: 'Ekspor Lembar RCA',
    description: 'Mengekspor lembar kerja analisis akar masalah (RCA) ke format Excel.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 16. Laporan Risiko OPD (Pelaporan & Dokumen)
  'laporan.view': {
    label: 'Lihat Laporan Risiko OPD',
    description: 'Melihat pusat laporan dan lembar rekapitulasi risiko seluruh perangkat daerah.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'laporan.export': {
    label: 'Ekspor & Cetak Laporan',
    description: 'Mengekspor laporan rekapitulasi risiko ke Excel (.xlsx) dan dokumen cetak resmi PDF.',
    risk: 'low',
    badgeLabel: 'Aman',
  },

  // 17. Log Audit Keamanan (Keamanan & Sistem)
  'audit.view': {
    label: 'Lihat Log Audit',
    description: 'Memantau rekaman jejak audit, aktivitas pengguna, dan log keamanan sistem.',
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

  // 18. Banner Login & Publik (Manajemen Konten)
  'content.view': {
    label: 'Lihat Banner Portal',
    description: 'Melihat galeri materi publikasi dan banner informasi portal login.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'content.create': {
    label: 'Tambah Banner Portal',
    description: 'Mengunggah materi banner baru untuk halaman login atau pengumuman.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'content.edit': {
    label: 'Edit Banner Portal',
    description: 'Mengubah status tayang dan mengatur prioritas urutan banner.',
    risk: 'medium',
    badgeLabel: 'Menengah',
  },
  'content.delete': {
    label: 'Hapus Banner Portal',
    description: 'Menghapus materi publikasi banner dari portal.',
    risk: 'critical',
    badgeLabel: 'Kritis',
  },

  // 19. Pengaturan Sistem (Pengaturan)
  'settings.view': {
    label: 'Lihat Pengaturan Sistem',
    description: 'Melihat konfigurasi parameter sistem, profil instansi, dan modul dinas.',
    risk: 'low',
    badgeLabel: 'Aman',
  },
  'settings.edit': {
    label: 'Ubah Pengaturan Sistem',
    description: 'Mengubah konfigurasi keamanan sistem, batas sesi, dan parameter dinas.',
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
