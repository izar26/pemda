<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define Master Permissions strictly aligned with Sidebar Navigation hierarchy (100% clean)
        $moduleDefinitions = [
            // Kategori: Menu Utama
            [
                'group' => 'Perangkat Daerah',
                'category' => 'Menu Utama',
                'sort_order' => 1,
                'permissions' => [
                    ['name' => 'opd.view', 'description' => 'Melihat direktori instansi perangkat daerah (Fitur 11)'],
                    ['name' => 'opd.create', 'description' => 'Menambahkan data instansi perangkat daerah baru (Fitur 11)'],
                    ['name' => 'opd.edit', 'description' => 'Mengubah data perangkat daerah dan kepala dinas (Fitur 11)'],
                    ['name' => 'opd.delete', 'description' => 'Menghapus data instansi perangkat daerah (Fitur 11)'],
                ],
            ],
            [
                'group' => 'Manajemen Pegawai',
                'category' => 'Menu Utama',
                'sort_order' => 2,
                'permissions' => [
                    ['name' => 'pegawai.view', 'description' => 'Melihat direktori dan biodata kepegawaian ASN per OPD (Fitur 12)'],
                    ['name' => 'pegawai.create', 'description' => 'Menambahkan data pegawai baru ke instansi OPD (Fitur 12)'],
                    ['name' => 'pegawai.edit', 'description' => 'Mengubah biodata, mutasi OPD, dan jabatan Kepala OPD / Pegawai (Fitur 12)'],
                    ['name' => 'pegawai.delete', 'description' => 'Menghapus data pegawai dari sistem (Fitur 12)'],
                ],
            ],
            [
                'group' => 'Manajemen Hak Akses',
                'category' => 'Menu Utama',
                'sort_order' => 3,
                'permissions' => [
                    ['name' => 'roles.view', 'description' => 'Melihat daftar peran dan matriks hak akses (Fitur 8)'],
                    ['name' => 'roles.create', 'description' => 'Membuat peran (role) baru (Fitur 8)'],
                    ['name' => 'roles.edit', 'description' => 'Mengubah konfigurasi matriks hak akses pada peran (Fitur 8)'],
                    ['name' => 'roles.delete', 'description' => 'Menghapus peran kustom (Fitur 8)'],
                ],
            ],
            [
                'group' => 'Manajemen Users',
                'category' => 'Menu Utama',
                'sort_order' => 4,
                'permissions' => [
                    ['name' => 'users.view', 'description' => 'Melihat daftar akun pengguna (users) dan status keamanan 2FA (Fitur 9)'],
                    ['name' => 'users.create', 'description' => 'Memberikan akun login dan menetapkan peran (role) kepada pegawai (Fitur 9)'],
                    ['name' => 'users.edit', 'description' => 'Mengubah peran (role), kata sandi, dan status aktif/nonaktif akun (Fitur 9)'],
                    ['name' => 'users.delete', 'description' => 'Mencabut akun login pengguna dari sistem (Fitur 9)'],
                    ['name' => 'users.reset_2fa', 'description' => 'Mereset Google Authenticator (2FA) akun pengguna (Fitur Khusus)'],
                ],
            ],

            // Kategori: Perencanaan Kinerja
            [
                'group' => 'Data Master',
                'category' => 'Perencanaan Kinerja',
                'sort_order' => 5,
                'permissions' => [
                    ['name' => 'master.view', 'description' => 'Melihat referensi data master dan parameter sistem (Fitur 10)'],
                    ['name' => 'master.create', 'description' => 'Menambahkan entri referensi data master baru (Fitur 10)'],
                    ['name' => 'master.edit', 'description' => 'Mengubah entri referensi data master (Fitur 10)'],
                    ['name' => 'master.delete', 'description' => 'Menghapus entri referensi data master (Fitur 10)'],
                ],
            ],
            [
                'group' => 'Periode Penilaian',
                'category' => 'Perencanaan Kinerja',
                'sort_order' => 6,
                'permissions' => [
                    ['name' => 'periode.view', 'description' => 'Melihat daftar siklus periode penilaian RPJMD (Fitur 13)'],
                    ['name' => 'periode.create', 'description' => 'Menambahkan siklus periode penilaian RPJMD baru (Fitur 13)'],
                    ['name' => 'periode.edit', 'description' => 'Mengubah periode penilaian dan mengganti tahun aktif (Fitur 13)'],
                    ['name' => 'periode.delete', 'description' => 'Menghapus periode penilaian yang belum memiliki relasi data (Fitur 13)'],
                ],
            ],
            [
                'group' => 'Tujuan, Sasaran & Indikator',
                'category' => 'Perencanaan Kinerja',
                'sort_order' => 7,
                'permissions' => [
                    ['name' => 'tujuan.view', 'description' => 'Melihat pohon kinerja Tujuan, Sasaran & Indikator Renstra OPD (Fitur 14-17)'],
                    ['name' => 'tujuan.create', 'description' => 'Menambahkan Tujuan, Sasaran & Indikator Renstra OPD baru (Fitur 14-17)'],
                    ['name' => 'tujuan.edit', 'description' => 'Mengubah data serta urutan Tujuan, Sasaran & Indikator Renstra OPD (Fitur 14-17)'],
                    ['name' => 'tujuan.delete', 'description' => 'Menghapus data Tujuan, Sasaran & Indikator Renstra OPD (Fitur 14-17)'],
                    ['name' => 'tujuan.copy', 'description' => 'Menyalin Tujuan, Sasaran & Indikator dari periode penilaian sebelumnya (Fitur Khusus)'],
                ],
            ],

            // Kategori: Pengawasan & Review
            [
                'group' => 'Penugasan Evaluator',
                'category' => 'Pengawasan & Review',
                'sort_order' => 8,
                'permissions' => [
                    ['name' => 'penugasan_evaluator.view', 'description' => 'Melihat daftar penugasan evaluator pengawas ke perangkat daerah (OPD)'],
                    ['name' => 'penugasan_evaluator.create', 'description' => 'Menetapkan penugasan evaluator pengawas ke satu atau beberapa OPD'],
                    ['name' => 'penugasan_evaluator.edit', 'description' => 'Mengubah penugasan dan cakupan OPD binaan evaluator'],
                    ['name' => 'penugasan_evaluator.delete', 'description' => 'Mencabut penugasan evaluator dari suatu OPD'],
                ],
            ],
            [
                'group' => 'Review Risiko',
                'category' => 'Pengawasan & Review',
                'sort_order' => 9,
                'permissions' => [
                    ['name' => 'penilaian_risiko.submit', 'description' => 'Mengajukan lembar kerja pengelolaan risiko OPD untuk ditinjau oleh Evaluator Pengawas'],
                    ['name' => 'review_risiko.view', 'description' => 'Melihat daftar dan status pengajuan lembar kerja risiko OPD binaan'],
                    ['name' => 'review_risiko.approve', 'description' => 'Melakukan persetujuan atau penolakan per-form risiko beserta catatan revisi'],
                    ['name' => 'review_risiko.review_kepala', 'description' => 'Memeriksa dan menyetujui lembar kerja risiko internal OPD tingkat Kepala OPD'],
                    ['name' => 'review_risiko.review_pengawas', 'description' => 'Memeriksa dan mengesahkan lembar kerja risiko tingkat akhir Pengawas APIP (Inspektorat)'],
                ],
            ],

            // Kategori: Pengelolaan Risiko
            [
                'group' => 'Konteks Strategis (2B)',
                'category' => 'Pengelolaan Risiko',
                'sort_order' => 10,
                'permissions' => [
                    ['name' => 'konteks_risiko.view', 'description' => 'Melihat penetapan konteks risiko strategis OPD (Fitur 26 - Form 2B)'],
                    ['name' => 'konteks_risiko.create', 'description' => 'Menetapkan konteks risiko strategis OPD baru (Fitur 26 - Form 2B)'],
                    ['name' => 'konteks_risiko.edit', 'description' => 'Mengubah penetapan konteks risiko strategis OPD (Fitur 26 - Form 2B)'],
                    ['name' => 'konteks_risiko.delete', 'description' => 'Menghapus penetapan konteks risiko strategis OPD (Fitur 26 - Form 2B)'],
                    ['name' => 'konteks_risiko.export', 'description' => 'Mengekspor atau mencetak berkas Form 2B (Fitur 26 & 31)'],
                ],
            ],
            [
                'group' => 'Konteks Operasional (2C)',
                'category' => 'Pengelolaan Risiko',
                'sort_order' => 11,
                'permissions' => [
                    ['name' => 'konteks_operasional.view', 'description' => 'Melihat penetapan konteks risiko operasional OPD (Fitur 26 - Form 2C)'],
                    ['name' => 'konteks_operasional.create', 'description' => 'Menetapkan konteks risiko operasional OPD baru (Fitur 26 - Form 2C)'],
                    ['name' => 'konteks_operasional.edit', 'description' => 'Mengubah penetapan konteks risiko operasional OPD (Fitur 26 - Form 2C)'],
                    ['name' => 'konteks_operasional.delete', 'description' => 'Menghapus penetapan konteks risiko operasional OPD (Fitur 26 - Form 2C)'],
                    ['name' => 'konteks_operasional.export', 'description' => 'Mengekspor atau mencetak berkas Form 2C (Fitur 26 & 31)'],
                ],
            ],
            [
                'group' => 'Identifikasi Pemda (3A)',
                'category' => 'Pengelolaan Risiko',
                'sort_order' => 12,
                'permissions' => [
                    ['name' => 'identifikasi_risiko_pemda.view', 'description' => 'Melihat identifikasi risiko strategis Pemda (Fitur 26 - Form 3A)'],
                    ['name' => 'identifikasi_risiko_pemda.create', 'description' => 'Menambahkan risiko strategis Pemda baru (Fitur 26 - Form 3A)'],
                    ['name' => 'identifikasi_risiko_pemda.edit', 'description' => 'Mengubah identifikasi risiko strategis Pemda (Fitur 26 - Form 3A)'],
                    ['name' => 'identifikasi_risiko_pemda.delete', 'description' => 'Menghapus risiko strategis Pemda (Fitur 26 - Form 3A)'],
                    ['name' => 'identifikasi_risiko_pemda.export', 'description' => 'Mengekspor atau mencetak berkas Form 3A (Fitur 26 & 31)'],
                ],
            ],
            [
                'group' => 'Identifikasi OPD (3B - 10 & FRA)',
                'category' => 'Pengelolaan Risiko',
                'sort_order' => 13,
                'permissions' => [
                    ['name' => 'identifikasi_risiko_opd.view', 'description' => 'Melihat identifikasi risiko strategis OPD Form 3B & rangkaian Form 4-10 serta FRA'],
                    ['name' => 'identifikasi_risiko_opd.create', 'description' => 'Menambahkan data risiko OPD baru pada rangkaian Form 3B-10'],
                    ['name' => 'identifikasi_risiko_opd.edit', 'description' => 'Mengubah formulir identifikasi, analisis, dan rencana tindak risiko OPD'],
                    ['name' => 'identifikasi_risiko_opd.delete', 'description' => 'Menghapus data risiko OPD dari register risiko'],
                    ['name' => 'identifikasi_risiko_opd.export', 'description' => 'Mengekspor atau mencetak berkas Form 3B-10 dan FRA'],
                ],
            ],
            [
                'group' => 'Identifikasi Operasional (3C)',
                'category' => 'Pengelolaan Risiko',
                'sort_order' => 14,
                'permissions' => [
                    ['name' => 'identifikasi_risiko_opd_operasional.view', 'description' => 'Melihat identifikasi risiko operasional OPD (Fitur 26 - Form 3C)'],
                    ['name' => 'identifikasi_risiko_opd_operasional.create', 'description' => 'Menambahkan risiko operasional OPD baru (Fitur 26 - Form 3C)'],
                    ['name' => 'identifikasi_risiko_opd_operasional.edit', 'description' => 'Mengubah identifikasi risiko operasional OPD (Fitur 26 - Form 3C)'],
                    ['name' => 'identifikasi_risiko_opd_operasional.delete', 'description' => 'Menghapus risiko operasional OPD (Fitur 26 - Form 3C)'],
                    ['name' => 'identifikasi_risiko_opd_operasional.export', 'description' => 'Mengekspor atau mencetak berkas Form 3C (Fitur 26 & 31)'],
                ],
            ],
            [
                'group' => 'Root Cause Analysis (RCA)',
                'category' => 'Pengelolaan Risiko',
                'sort_order' => 15,
                'permissions' => [
                    ['name' => 'rca.view', 'description' => 'Melihat analisis akar penyebab masalah 5-Whys (Fitur 26 - Form RCA)'],
                    ['name' => 'rca.edit', 'description' => 'Mengisi dan memperbarui analisis 5-Whys dan kegiatan pengendalian (Fitur 26 - Form RCA)'],
                    ['name' => 'rca.export', 'description' => 'Mengekspor lembar kerja RCA (Fitur 26 & 31)'],
                ],
            ],

            // Kategori: Pelaporan & Dokumen
            [
                'group' => 'Laporan Risiko OPD',
                'category' => 'Pelaporan & Dokumen',
                'sort_order' => 16,
                'permissions' => [
                    ['name' => 'laporan.view', 'description' => 'Melihat lembar dan pusat laporan risiko OPD (Fitur 26 & 31)'],
                    ['name' => 'laporan.export', 'description' => 'Mengekspor laporan risiko ke berkas Excel (.xlsx) dan Cetak PDF (Fitur 26 & 31)'],
                ],
            ],

            // Kategori: Keamanan & Sistem
            [
                'group' => 'Log Audit Keamanan',
                'category' => 'Keamanan & Sistem',
                'sort_order' => 17,
                'permissions' => [
                    ['name' => 'audit.view', 'description' => 'Melihat riwayat aktivitas dan log audit keamanan (Fitur 5)'],
                    ['name' => 'audit.export', 'description' => 'Mengekspor berkas log aktivitas ke Excel (Fitur 5)'],
                    ['name' => 'audit.purge', 'description' => 'Membersihkan arsip log audit yang telah melampaui retensi (Fitur Khusus)'],
                ],
            ],

            // Kategori: Manajemen Konten
            [
                'group' => 'Banner Login & Publik',
                'category' => 'Manajemen Konten',
                'sort_order' => 18,
                'permissions' => [
                    ['name' => 'content.view', 'description' => 'Melihat daftar banner portal login dan publik (CMS)'],
                    ['name' => 'content.create', 'description' => 'Mengunggah gambar dan materi banner baru (CMS)'],
                    ['name' => 'content.edit', 'description' => 'Mengubah urutan tampilan dan status aktif banner (CMS)'],
                    ['name' => 'content.delete', 'description' => 'Menghapus materi banner dari portal (CMS)'],
                ],
            ],

            // Kategori: Pengaturan
            [
                'group' => 'Pengaturan Sistem',
                'category' => 'Pengaturan',
                'sort_order' => 19,
                'permissions' => [
                    ['name' => 'settings.view', 'description' => 'Melihat konfigurasi parameter sistem dan instansi (Fitur 7)'],
                    ['name' => 'settings.edit', 'description' => 'Mengubah konfigurasi keamanan dan parameter sistem (Fitur 7)'],
                ],
            ],
        ];

        $allPermissions = [];
        foreach ($moduleDefinitions as $module) {
            foreach ($module['permissions'] as $perm) {
                $permission = Permission::updateOrCreate(
                    ['name' => $perm['name'], 'guard_name' => 'web'],
                    [
                        'group' => $module['group'],
                        'category' => $module['category'],
                        'sort_order' => $module['sort_order'],
                        'description' => $perm['description'],
                    ]
                );
                $allPermissions[$perm['name']] = $permission;
            }
        }

        // Clean up obsolete/prototype permissions no longer in definition
        Permission::whereNotIn('name', array_keys($allPermissions))->delete();

        // 2. Define Standard Roles based on current active RBAC configuration
        $rolesDefinition = [
            'Superadmin' => [
                'description' => 'Administrator teknis dengan hak akses penuh ke seluruh fitur dan pengaturan sistem.',
                'is_system' => true,
                'permissions' => array_keys($allPermissions),
            ],
            'Administrator' => [
                'description' => 'Pengelola operasional data induk, pegawai, master data, dan pemantauan menyeluruh.',
                'is_system' => false,
                'permissions' => [
                    'opd.view', 'opd.create', 'opd.edit', 'opd.delete',
                    'pegawai.view', 'pegawai.create', 'pegawai.edit', 'pegawai.delete',
                    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.reset_2fa',
                    'master.view', 'master.create', 'master.edit', 'master.delete',
                    'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
                    'periode.view', 'periode.create', 'periode.edit', 'periode.delete',
                    'settings.view', 'settings.edit',
                    'content.view', 'content.create', 'content.edit', 'content.delete',
                    'audit.view', 'audit.export',
                ],
            ],
            'Bapperida' => [
                'description' => 'Badan Perencanaan yang mengelola Periode Penilaian (Fitur 13) dan Cascading Makro Kinerja (Fitur 14-17).',
                'is_system' => false,
                'permissions' => [
                    'tujuan.view', 'tujuan.create', 'tujuan.edit', 'tujuan.delete', 'tujuan.copy',
                    'audit.view', 'audit.export',
                ],
            ],
            'Operator OPD' => [
                'description' => 'Organisasi Perangkat Daerah yang mengelola data Renstra dan Risiko pada instansi masing-masing.',
                'is_system' => false,
                'permissions' => [
                    'tujuan.view',
                    'konteks_risiko.view', 'konteks_risiko.create', 'konteks_risiko.edit', 'konteks_risiko.export',
                    'konteks_operasional.view', 'konteks_operasional.create', 'konteks_operasional.edit', 'konteks_operasional.export',
                    'identifikasi_risiko_pemda.view', 'identifikasi_risiko_pemda.create', 'identifikasi_risiko_pemda.edit', 'identifikasi_risiko_pemda.delete', 'identifikasi_risiko_pemda.export',
                    'identifikasi_risiko_opd.view', 'identifikasi_risiko_opd.create', 'identifikasi_risiko_opd.edit', 'identifikasi_risiko_opd.delete', 'identifikasi_risiko_opd.export',
                    'identifikasi_risiko_opd_operasional.view', 'identifikasi_risiko_opd_operasional.create', 'identifikasi_risiko_opd_operasional.edit', 'identifikasi_risiko_opd_operasional.delete', 'identifikasi_risiko_opd_operasional.export',
                    'rca.view', 'rca.edit', 'rca.export',
                    'penilaian_risiko.submit',
                    'audit.view', 'audit.export',
                ],
            ],
            'Koordinator Pengawas' => [
                'description' => 'APIP / Pengawas Daerah yang memantau evaluasi SPIP, survei, wilayah, dan rekap risiko.',
                'is_system' => false,
                'permissions' => [
                    'penugasan_evaluator.view', 'penugasan_evaluator.create', 'penugasan_evaluator.edit', 'penugasan_evaluator.delete',
                    'review_risiko.view', 'review_risiko.approve', 'review_risiko.review_pengawas',
                    'laporan.view', 'laporan.export',
                    'audit.view', 'audit.export',
                ],
            ],
            'Evaluator / Reviewer' => [
                'description' => 'Fungsional pengawas yang melaksanakan audit, riviu, dan tindak lanjut rekomendasi perbaikan.',
                'is_system' => false,
                'permissions' => [
                    'review_risiko.view', 'review_risiko.approve', 'review_risiko.review_kepala', 'review_risiko.review_pengawas',
                    'penilaian_risiko.submit',
                    'audit.view', 'audit.export',
                ],
            ],
            'Executive' => [
                'description' => 'Pimpinan Daerah (Bupati / Sekda / Kepala OPD) untuk memantau dashboard eksekutif dan lembar risiko.',
                'is_system' => false,
                'permissions' => [
                    'review_risiko.view', 'review_risiko.approve', 'review_risiko.review_kepala', 'review_risiko.review_pengawas',
                    'penilaian_risiko.submit',
                    'laporan.view', 'laporan.export',
                    'audit.view', 'audit.export',
                ],
            ],
        ];

        foreach ($rolesDefinition as $roleName => $info) {
            $role = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                [
                    'description' => $info['description'],
                    'is_system' => $info['is_system'],
                ]
            );

            // Sync permissions to ensure role permissions match the exact definition
            $role->syncPermissions($info['permissions'] ?? []);
        }

        // 3. Assign Superadmin to Default Superadmin User if already created
        $superadmin = User::where('email', 'superadmin@pemda.go.id')->first();
        if ($superadmin) {
            $superadmin->syncRoles(['Superadmin']);
        }

        // Clear cache again after seeding
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
