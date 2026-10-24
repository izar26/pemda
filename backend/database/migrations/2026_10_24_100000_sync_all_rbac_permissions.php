<?php

declare(strict_types=1);

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('permissions') || !Schema::hasTable('roles')) {
            return;
        }

        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define Master Permissions strictly per active application modules
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
            'Review & Persetujuan Risiko' => [
                ['name' => 'penilaian_risiko.submit', 'description' => 'Mengajukan lembar kerja pengelolaan risiko OPD untuk ditinjau oleh Auditor Pengawas'],
                ['name' => 'review_risiko.view', 'description' => 'Melihat daftar dan status pengajuan lembar kerja risiko OPD binaan'],
                ['name' => 'review_risiko.approve', 'description' => 'Melakukan persetujuan atau penolakan per-form risiko beserta catatan revisi'],
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

        // 2. Define standard role assignments
        $rolesDefinition = [
            'Superadmin' => array_keys($allPermissions),
            'Admin Office' => [
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
                'penilaian_risiko.submit', 'review_risiko.view',
                'laporan.view', 'laporan.export',
                'audit.view', 'audit.export',
                'content.view', 'content.create', 'content.edit', 'content.delete',
                'settings.view', 'settings.edit',
            ],
            'Bapperida' => [
                'periode.view', 'periode.create', 'periode.edit', 'periode.delete',
                'tujuan.view', 'tujuan.create', 'tujuan.edit', 'tujuan.delete', 'tujuan.copy',
                'konteks_risiko.view', 'konteks_risiko.export',
                'konteks_operasional.view', 'konteks_operasional.export',
                'laporan.view', 'laporan.export',
            ],
            'OPD' => [
                'tujuan.view',
                'konteks_risiko.view', 'konteks_risiko.create', 'konteks_risiko.edit', 'konteks_risiko.export',
                'konteks_operasional.view', 'konteks_operasional.create', 'konteks_operasional.edit', 'konteks_operasional.export',
                'penilaian_risiko.submit',
                'laporan.view', 'laporan.export',
            ],
            'Inspektorat' => [
                'tujuan.view',
                'konteks_risiko.view', 'konteks_risiko.export',
                'konteks_operasional.view', 'konteks_operasional.export',
                'penugasan_auditor.view', 'penugasan_auditor.create', 'penugasan_auditor.edit', 'penugasan_auditor.delete',
                'review_risiko.view', 'review_risiko.approve',
                'laporan.view', 'laporan.export',
                'audit.view', 'audit.export',
            ],
            'Auditor' => [
                'tujuan.view',
                'konteks_risiko.view', 'konteks_risiko.export',
                'konteks_operasional.view', 'konteks_operasional.export',
                'penugasan_auditor.view',
                'review_risiko.view', 'review_risiko.approve',
                'laporan.view', 'laporan.export',
                'audit.view',
            ],
            'Executive' => [
                'konteks_risiko.view', 'konteks_risiko.export',
                'konteks_operasional.view', 'konteks_operasional.export',
                'laporan.view', 'laporan.export',
            ],
        ];

        foreach ($rolesDefinition as $roleName => $perms) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->givePermissionTo($perms);
            }
        }

        // Reset cache again
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op for safety of existing live role-permission mappings
    }
};
