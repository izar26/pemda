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

        // 1. Define Master Permissions strictly per active menu in application (100% clean)
        // Group name matches the navigation menu structure
        $permissionGroups = [
            'Perangkat Daerah (OPD)' => [
                ['name' => 'opd.view', 'description' => 'Melihat direktori instansi perangkat daerah (Fitur 11)'],
                ['name' => 'opd.create', 'description' => 'Menambahkan data instansi perangkat daerah baru (Fitur 11)'],
                ['name' => 'opd.edit', 'description' => 'Mengubah data perangkat daerah dan kepala dinas (Fitur 11)'],
                ['name' => 'opd.delete', 'description' => 'Menghapus data instansi perangkat daerah (Fitur 11)'],
            ],
            'Manajemen Pegawai' => [
                ['name' => 'pegawai.view', 'description' => 'Melihat direktori dan biodata kepegawaian ASN per OPD (Fitur 12)'],
                ['name' => 'pegawai.create', 'description' => 'Menambahkan data pegawai baru ke instansi OPD (Fitur 12)'],
                ['name' => 'pegawai.edit', 'description' => 'Mengubah biodata, mutasi OPD, dan jabatan Kepala OPD / Pegawai (Fitur 12)'],
                ['name' => 'pegawai.delete', 'description' => 'Menghapus data pegawai dari sistem (Fitur 12)'],
            ],
            'Data Master' => [
                ['name' => 'master.view', 'description' => 'Melihat referensi data master dan parameter sistem (Fitur 10)'],
                ['name' => 'master.create', 'description' => 'Menambahkan entri referensi data master baru (Fitur 10)'],
                ['name' => 'master.edit', 'description' => 'Mengubah entri referensi data master (Fitur 10)'],
                ['name' => 'master.delete', 'description' => 'Menghapus entri referensi data master (Fitur 10)'],
            ],
            'Peran & Izin' => [
                ['name' => 'roles.view', 'description' => 'Melihat daftar peran dan matriks hak akses (Fitur 8)'],
                ['name' => 'roles.create', 'description' => 'Membuat peran (role) baru (Fitur 8)'],
                ['name' => 'roles.edit', 'description' => 'Mengubah konfigurasi matriks hak akses pada peran (Fitur 8)'],
                ['name' => 'roles.delete', 'description' => 'Menghapus peran kustom (Fitur 8)'],
            ],
            'Manajemen Users' => [
                ['name' => 'users.view', 'description' => 'Melihat daftar akun pengguna (users) dan status keamanan 2FA (Fitur 9)'],
                ['name' => 'users.create', 'description' => 'Memberikan akun login dan menetapkan peran (role) kepada pegawai (Fitur 9)'],
                ['name' => 'users.edit', 'description' => 'Mengubah peran (role), kata sandi, dan status aktif/nonaktif akun (Fitur 9)'],
                ['name' => 'users.delete', 'description' => 'Mencabut akun login pengguna dari sistem (Fitur 9)'],
                ['name' => 'users.reset_2fa', 'description' => 'Mereset Google Authenticator (2FA) akun pengguna (Fitur Khusus)'],
            ],
            'Periode Penilaian' => [
                ['name' => 'periode.view', 'description' => 'Melihat daftar siklus periode penilaian RPJMD (Fitur 13)'],
                ['name' => 'periode.create', 'description' => 'Menambahkan siklus periode penilaian RPJMD baru (Fitur 13)'],
                ['name' => 'periode.edit', 'description' => 'Mengubah periode penilaian dan mengganti tahun aktif (Fitur 13)'],
                ['name' => 'periode.delete', 'description' => 'Menghapus periode penilaian yang belum memiliki relasi data (Fitur 13)'],
            ],
            'Tujuan, Sasaran & Indikator' => [
                ['name' => 'tujuan.view', 'description' => 'Melihat pohon kinerja Tujuan, Sasaran & Indikator Renstra OPD (Fitur 14-17)'],
                ['name' => 'tujuan.create', 'description' => 'Menambahkan Tujuan, Sasaran & Indikator Renstra OPD baru (Fitur 14-17)'],
                ['name' => 'tujuan.edit', 'description' => 'Mengubah data serta urutan Tujuan, Sasaran & Indikator Renstra OPD (Fitur 14-17)'],
                ['name' => 'tujuan.delete', 'description' => 'Menghapus data Tujuan, Sasaran & Indikator Renstra OPD (Fitur 14-17)'],
                ['name' => 'tujuan.copy', 'description' => 'Menyalin Tujuan, Sasaran & Indikator dari periode penilaian sebelumnya (Fitur Khusus)'],
            ],
            'Konteks Risiko Strategis' => [
                ['name' => 'konteks_risiko.view', 'description' => 'Melihat penetapan konteks risiko strategis OPD (Fitur 26 - Form 2B)'],
                ['name' => 'konteks_risiko.create', 'description' => 'Menetapkan konteks risiko strategis OPD baru (Fitur 26 - Form 2B)'],
                ['name' => 'konteks_risiko.edit', 'description' => 'Mengubah penetapan konteks risiko strategis OPD (Fitur 26 - Form 2B)'],
                ['name' => 'konteks_risiko.delete', 'description' => 'Menghapus penetapan konteks risiko strategis OPD (Fitur 26 - Form 2B)'],
                ['name' => 'konteks_risiko.export', 'description' => 'Mengekspor atau mencetak berkas Form 2B (Fitur 26 & 31)'],
            ],
            'Konteks Risiko Operasional' => [
                ['name' => 'konteks_operasional.view', 'description' => 'Melihat penetapan konteks risiko operasional OPD (Fitur 26 - Form 2C)'],
                ['name' => 'konteks_operasional.create', 'description' => 'Menetapkan konteks risiko operasional OPD baru (Fitur 26 - Form 2C)'],
                ['name' => 'konteks_operasional.edit', 'description' => 'Mengubah penetapan konteks risiko operasional OPD (Fitur 26 - Form 2C)'],
                ['name' => 'konteks_operasional.delete', 'description' => 'Menghapus penetapan konteks risiko operasional OPD (Fitur 26 - Form 2C)'],
                ['name' => 'konteks_operasional.export', 'description' => 'Mengekspor atau mencetak berkas Form 2C (Fitur 26 & 31)'],
            ],
            'Log Audit Keamanan' => [
                ['name' => 'audit.view', 'description' => 'Melihat riwayat aktivitas dan log audit keamanan (Fitur 5)'],
                ['name' => 'audit.export', 'description' => 'Mengekspor berkas log aktivitas ke Excel (Fitur 5)'],
                ['name' => 'audit.purge', 'description' => 'Membersihkan arsip log audit yang telah melampaui retensi (Fitur Khusus)'],
            ],
            'Penugasan Auditor' => [
                ['name' => 'penugasan_auditor.view', 'description' => 'Melihat daftar penugasan auditor pengawas ke perangkat daerah (OPD)'],
                ['name' => 'penugasan_auditor.create', 'description' => 'Menetapkan penugasan auditor pengawas ke satu atau beberapa OPD'],
                ['name' => 'penugasan_auditor.edit', 'description' => 'Mengubah penugasan dan cakupan OPD binaan auditor'],
                ['name' => 'penugasan_auditor.delete', 'description' => 'Mencabut penugasan auditor dari suatu OPD'],
            ],
            'Banner Login & Publik' => [
                ['name' => 'content.view', 'description' => 'Melihat daftar banner portal login dan publik (CMS)'],
                ['name' => 'content.create', 'description' => 'Mengunggah gambar dan materi banner baru (CMS)'],
                ['name' => 'content.edit', 'description' => 'Mengubah urutan tampilan dan status aktif banner (CMS)'],
                ['name' => 'content.delete', 'description' => 'Menghapus materi banner dari portal (CMS)'],
            ],
            'Pelaporan & Dokumen' => [
                ['name' => 'laporan.view', 'description' => 'Melihat lembar dan pusat laporan risiko OPD (Fitur 26 & 31)'],
                ['name' => 'laporan.export', 'description' => 'Mengekspor laporan risiko ke berkas Excel (.xlsx) dan Cetak PDF (Fitur 26 & 31)'],
            ],
            'Pengaturan Sistem' => [
                ['name' => 'settings.view', 'description' => 'Melihat konfigurasi parameter sistem dan instansi (Fitur 7)'],
                ['name' => 'settings.edit', 'description' => 'Mengubah konfigurasi keamanan dan parameter sistem (Fitur 7)'],
            ],
        ];

        $allPermissions = [];
        foreach ($permissionGroups as $group => $permissions) {
            foreach ($permissions as $perm) {
                $permission = Permission::updateOrCreate(
                    ['name' => $perm['name'], 'guard_name' => 'web'],
                    [
                        'group' => $group,
                        'description' => $perm['description'],
                    ]
                );
                $allPermissions[$perm['name']] = $permission;
            }
        }

        // Clean up obsolete/prototype permissions no longer in definition
        Permission::whereNotIn('name', array_keys($allPermissions))->delete();

        // 2. Define Standard Roles based on Fitur dan Hak Akses Aplikasi.xlsx
        $rolesDefinition = [
            'Superadmin' => [
                'description' => 'Administrator teknis dengan hak akses penuh ke seluruh fitur dan pengaturan sistem.',
                'is_system' => true,
                'permissions' => array_keys($allPermissions),
            ],
            'Admin Office' => [
                'description' => 'Pengelola operasional data induk, pegawai, master data, dan pemantauan menyeluruh.',
                'is_system' => false,
                'permissions' => [
                    'opd.view', 'opd.create', 'opd.edit', 'opd.delete',
                    'pegawai.view', 'pegawai.create', 'pegawai.edit', 'pegawai.delete',
                    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.reset_2fa',
                    'master.view', 'master.create', 'master.edit', 'master.delete',
                    'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
                    'periode.view', 'periode.create', 'periode.edit', 'periode.delete',
                    'tujuan.view', 'tujuan.create', 'tujuan.edit', 'tujuan.delete', 'tujuan.copy',
                    'konteks_risiko.view', 'konteks_risiko.create', 'konteks_risiko.edit', 'konteks_risiko.delete', 'konteks_risiko.export',
                    'konteks_operasional.view', 'konteks_operasional.create', 'konteks_operasional.edit', 'konteks_operasional.delete', 'konteks_operasional.export',
                    'penugasan_auditor.view', 'penugasan_auditor.create', 'penugasan_auditor.edit', 'penugasan_auditor.delete',
                    'laporan.view', 'laporan.export',
                    'audit.view', 'audit.export',
                    'content.view', 'content.create', 'content.edit', 'content.delete',
                ],
            ],
            'Bapperida' => [
                'description' => 'Badan Perencanaan yang mengelola Periode Penilaian (Fitur 13) dan Cascading Makro Kinerja (Fitur 14-17).',
                'is_system' => false,
                'permissions' => [
                    'periode.view', 'periode.create', 'periode.edit', 'periode.delete',
                    'tujuan.view', 'tujuan.create', 'tujuan.edit', 'tujuan.delete', 'tujuan.copy',
                    'konteks_risiko.view', 'konteks_risiko.export',
                    'konteks_operasional.view', 'konteks_operasional.export',
                    'laporan.view', 'laporan.export',
                ],
            ],
            'OPD' => [
                'description' => 'Organisasi Perangkat Daerah yang mengelola data Renstra dan Risiko pada instansi masing-masing.',
                'is_system' => false,
                'permissions' => [
                    'tujuan.view',
                    'konteks_risiko.view', 'konteks_risiko.create', 'konteks_risiko.edit', 'konteks_risiko.export',
                    'konteks_operasional.view', 'konteks_operasional.create', 'konteks_operasional.edit', 'konteks_operasional.export',
                    'laporan.view', 'laporan.export',
                ],
            ],
            'Inspektorat' => [
                'description' => 'APIP / Pengawas Daerah yang memantau evaluasi SPIP, survei, wilayah, dan rekap risiko.',
                'is_system' => false,
                'permissions' => [
                    'tujuan.view',
                    'konteks_risiko.view', 'konteks_risiko.export',
                    'konteks_operasional.view', 'konteks_operasional.export',
                    'penugasan_auditor.view', 'penugasan_auditor.create', 'penugasan_auditor.edit', 'penugasan_auditor.delete',
                    'laporan.view', 'laporan.export',
                    'audit.view', 'audit.export',
                ],
            ],
            'Auditor' => [
                'description' => 'Fungsional pengawas yang melaksanakan audit, riviu, dan tindak lanjut rekomendasi perbaikan.',
                'is_system' => false,
                'permissions' => [
                    'tujuan.view',
                    'konteks_risiko.view', 'konteks_risiko.export',
                    'konteks_operasional.view', 'konteks_operasional.export',
                    'penugasan_auditor.view',
                    'laporan.view', 'laporan.export',
                    'audit.view',
                ],
            ],
            'Executive' => [
                'description' => 'Pimpinan Daerah (Bupati / Sekda) untuk memantau dashboard eksekutif dan laporan ringkasan.',
                'is_system' => false,
                'permissions' => [
                    'konteks_risiko.view', 'konteks_risiko.export',
                    'konteks_operasional.view', 'konteks_operasional.export',
                    'laporan.view', 'laporan.export',
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

            // Sync permissions for freshly created roles; safely grant for existing roles to avoid wiping custom admin edits in live environments
            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($info['permissions'] ?? []);
            } else {
                $role->givePermissionTo($info['permissions'] ?? []);
            }
        }

        // 3. Assign Superadmin to Default Administrator User
        $superadmin = User::where('email', 'administrator@pemda.go.id')->first()
            ?? User::where('email', 'admin@pemda.go.id')->first();
        if ($superadmin) {
            $superadmin->syncRoles(['Superadmin']);
        }

        // Clear cache again after seeding
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
