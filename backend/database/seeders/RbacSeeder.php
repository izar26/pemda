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

        // 1. Define Master Permissions grouped by module matching Fitur dan Hak Akses Aplikasi.xlsx
        $permissionGroups = [
            'Manajemen Pengguna' => [
                ['name' => 'users.view', 'description' => 'Melihat daftar dan profil pegawai (Fitur 9 & 12)'],
                ['name' => 'users.create', 'description' => 'Membuat akun pegawai baru (Fitur 9)'],
                ['name' => 'users.edit', 'description' => 'Mengubah data dan status pegawai (Fitur 9 & 12)'],
                ['name' => 'users.delete', 'description' => 'Menghapus atau menonaktifkan akun pegawai (Fitur 9)'],
                ['name' => 'users.reset_2fa', 'description' => 'Mereset Google Authenticator akun pegawai'],
            ],
            'Manajemen Peran & Izin' => [
                ['name' => 'roles.view', 'description' => 'Melihat daftar peran dan hak akses (Fitur 8)'],
                ['name' => 'roles.create', 'description' => 'Membuat peran/role baru (Fitur 8)'],
                ['name' => 'roles.edit', 'description' => 'Mengubah matriks izin pada peran (Fitur 8)'],
                ['name' => 'roles.delete', 'description' => 'Menghapus peran kustom (Fitur 8)'],
            ],
            'Keamanan & Log Audit' => [
                ['name' => 'audit.view', 'description' => 'Melihat log aktivitas dan audit keamanan (Fitur 5)'],
            ],
            'Pengaturan Sistem' => [
                ['name' => 'settings.view', 'description' => 'Melihat pengaturan sistem dan modul (Fitur 7)'],
                ['name' => 'settings.edit', 'description' => 'Mengubah pengaturan konfigurasi aplikasi (Fitur 7)'],
            ],
            'Perangkat Daerah (OPD)' => [
                ['name' => 'opd.view', 'description' => 'Melihat direktori instansi perangkat daerah (Fitur 11)'],
                ['name' => 'opd.create', 'description' => 'Menambahkan data instansi perangkat daerah baru (Fitur 11)'],
                ['name' => 'opd.edit', 'description' => 'Mengubah data perangkat daerah dan kepala dinas (Fitur 11)'],
                ['name' => 'opd.delete', 'description' => 'Menghapus data instansi perangkat daerah (Fitur 11)'],
            ],
            'Master Data' => [
                ['name' => 'master.view', 'description' => 'Melihat referensi data master dan parameter risiko (Fitur 10)'],
                ['name' => 'master.create', 'description' => 'Menambahkan entri referensi master data baru (Fitur 10)'],
                ['name' => 'master.edit', 'description' => 'Mengubah entri master data (Fitur 10)'],
                ['name' => 'master.delete', 'description' => 'Menonaktifkan atau menghapus entri master data (Fitur 10)'],
            ],
            'Perencanaan Kinerja (Bapperida)' => [
                ['name' => 'perencanaan.view', 'description' => 'Melihat periode penilaian dan cascading kinerja (Fitur 13-17)'],
                ['name' => 'perencanaan.periode', 'description' => 'Mengelola periode penilaian 5 tahunan dan tahun aktif (Fitur 13 - Sheet 1)'],
                ['name' => 'perencanaan.cascading', 'description' => 'Mengelola pohon Tujuan, Sasaran, IKU, dan Indikator (Fitur 14-17 - Sheet 2)'],
                ['name' => 'perencanaan.renstra', 'description' => 'Melihat dan menyelaraskan Renstra SKPD (Sheet 2C)'],
            ],
            'Pengelolaan Risiko (OPD)' => [
                ['name' => 'risiko.view', 'description' => 'Melihat registrasi dan formulir risiko OPD (Fitur 26)'],
                ['name' => 'risiko.konteks', 'description' => 'Mengelola Konteks Risiko Strategis (Form 2B) & Operasional (Form 2C)'],
                ['name' => 'risiko.penilaian', 'description' => 'Mengelola Identifikasi & Analisis Risiko Form 3-10 dan RCA (Fitur 26)'],
                ['name' => 'risiko.rtp', 'description' => 'Mengelola Rencana Tindak Pengendalian / RTP (Fitur 27)'],
                ['name' => 'risiko.kejadian', 'description' => 'Mencatat dan memantau Kejadian Risiko (Fitur 28)'],
                ['name' => 'risiko.pengendalian', 'description' => 'Memantau pelaksanaan kegiatan pengendalian risiko (Fitur 29)'],
                ['name' => 'risiko.fraud', 'description' => 'Mengelola penilaian risiko kecurangan / fraud (Fitur 30)'],
                ['name' => 'risiko.import', 'description' => 'Mengimpor data pengelolaan risiko via Excel (Fitur 33)'],
            ],
            'Pengawasan & Audit (APIP / Auditor)' => [
                ['name' => 'pengawasan.view', 'description' => 'Mengakses modul survei, monev, dan formulir SPIP (Fitur 18-22)'],
                ['name' => 'audit_spip.view', 'description' => 'Mengakses audit, riviu, dan tindak lanjut rekomendasi (Fitur 23-25)'],
            ],
            'Laporan & Arsip' => [
                ['name' => 'laporan.view', 'description' => 'Melihat dan mengekspor laporan manajemen risiko (Fitur 31)'],
                ['name' => 'arsip.view', 'description' => 'Melihat arsip penilaian dan data historis (Fitur 32)'],
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
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'roles.view',
                    'audit.view',
                    'opd.view', 'opd.create', 'opd.edit',
                    'master.view', 'master.create', 'master.edit',
                    'perencanaan.view', 'perencanaan.periode', 'perencanaan.cascading', 'perencanaan.renstra',
                    'risiko.view', 'risiko.konteks', 'risiko.penilaian', 'risiko.rtp', 'risiko.kejadian', 'risiko.pengendalian', 'risiko.fraud', 'risiko.import',
                    'pengawasan.view', 'audit_spip.view',
                    'laporan.view', 'arsip.view',
                ],
            ],
            'Bapperida' => [
                'description' => 'Badan Perencanaan yang mengelola Periode Penilaian (Fitur 13) dan Cascading Makro Kinerja (Fitur 14-17).',
                'is_system' => false,
                'permissions' => [
                    'perencanaan.view', 'perencanaan.periode', 'perencanaan.cascading', 'perencanaan.renstra',
                    'pengawasan.view',
                    'laporan.view', 'arsip.view',
                ],
            ],
            'OPD' => [
                'description' => 'Organisasi Perangkat Daerah yang mengelola Konteks Risiko (Form 2B & 2C) dan Penilaian Risiko OPD.',
                'is_system' => false,
                'permissions' => [
                    'perencanaan.view',
                    'risiko.view', 'risiko.konteks', 'risiko.penilaian', 'risiko.rtp', 'risiko.kejadian', 'risiko.pengendalian', 'risiko.fraud', 'risiko.import',
                    'laporan.view', 'arsip.view',
                ],
            ],
            'Inspektorat' => [
                'description' => 'APIP / Pengawas Daerah yang memantau evaluasi SPIP, survei, wilayah, dan rekap risiko.',
                'is_system' => false,
                'permissions' => [
                    'pengawasan.view',
                    'risiko.view',
                    'laporan.view', 'arsip.view',
                ],
            ],
            'Auditor' => [
                'description' => 'Fungsional pengawas yang melaksanakan audit, riviu, dan tindak lanjut rekomendasi perbaikan.',
                'is_system' => false,
                'permissions' => [
                    'audit_spip.view',
                    'risiko.view',
                    'laporan.view', 'arsip.view',
                ],
            ],
            'Executive' => [
                'description' => 'Pimpinan Daerah (Bupati / Sekda) untuk memantau dashboard eksekutif dan laporan ringkasan.',
                'is_system' => false,
                'permissions' => [
                    'laporan.view', 'arsip.view',
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

            // Sync permissions for this role
            if (!empty($info['permissions'])) {
                $role->syncPermissions($info['permissions']);
            }
        }

        // 3. Assign Superadmin to Default Admin User
        $admin = User::where('email', 'admin@pemda.go.id')->first();
        if ($admin) {
            $admin->syncRoles(['Superadmin']);
        }
    }
}
