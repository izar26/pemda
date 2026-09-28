<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class SystemSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // General Group
            [
                'key' => 'app_name',
                'value' => 'Portal Layanan Terpadu PEMDA',
                'group' => 'general',
                'type' => 'string',
                'label' => 'Nama Portal Resmi',
                'description' => 'Nama resmi portal terpadu pemerintah daerah yang tampil pada header dan dokumen.',
            ],
            [
                'key' => 'instance_name',
                'value' => 'Pemerintah Daerah Provinsi / Kota / Kabupaten',
                'group' => 'general',
                'type' => 'string',
                'label' => 'Nama Instansi Pemerintah',
                'description' => 'Identitas badan / lembaga pemerintahan pengelola portal.',
            ],
            [
                'key' => 'contact_email',
                'value' => 'helpdesk@pemda.go.id',
                'group' => 'general',
                'type' => 'string',
                'label' => 'Email Layanan / Helpdesk',
                'description' => 'Alamat surat elektronik resmi untuk pengaduan kendala akun pegawai.',
            ],
            [
                'key' => 'contact_phone',
                'value' => '(021) 1234-5678',
                'group' => 'general',
                'type' => 'string',
                'label' => 'Nomor Kontak Dukungan',
                'description' => 'Nomor telepon saluran siaga / bantuan teknis TI.',
            ],

            // Security Group
            [
                'key' => 'session_lifetime_minutes',
                'value' => '60',
                'group' => 'security',
                'type' => 'integer',
                'label' => 'Batas Waktu Sesi (Menit)',
                'description' => 'Durasi inaktivitas sebelum pengguna otomatis dikeluarkan dari sistem.',
            ],
            [
                'key' => 'require_2fa_for_admin',
                'value' => '1',
                'group' => 'security',
                'type' => 'boolean',
                'label' => 'Wajibkan 2FA untuk Administrator',
                'description' => 'Memaksa setiap akun dengan peran administratif mengaktifkan Google Authenticator.',
            ],
            [
                'key' => 'max_login_attempts',
                'value' => '5',
                'group' => 'security',
                'type' => 'integer',
                'label' => 'Batas Maksimal Percobaan Login',
                'description' => 'Jumlah toleransi kesalahan kata sandi sebelum akun diblokir sementara.',
            ],
            [
                'key' => 'maintenance_mode',
                'value' => '0',
                'group' => 'security',
                'type' => 'boolean',
                'label' => 'Mode Pemeliharaan Sistem',
                'description' => 'Membatasi akses hanya untuk Administrator Utama selama masa pembaruan server.',
            ],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        // Seed some initial audit logs
        $admin = User::where('email', 'admin@pemda.go.id')->first();

        if (AuditLog::count() === 0) {
            AuditLog::create([
                'user_id' => $admin?->id,
                'user_name' => $admin?->name ?? 'Administrator Utama',
                'user_nip' => $admin?->nip ?? '198501012010011001',
                'user_email' => $admin?->email ?? 'admin@pemda.go.id',
                'action' => 'SYSTEM_INIT',
                'module' => 'Pengaturan Sistem',
                'description' => 'Inisialisasi sistem portal dan konfigurasi awal basis data.',
                'ip_address' => '127.0.0.1',
                'user_agent' => 'System Seeder',
                'context' => ['status' => 'completed'],
                'created_at' => now()->subHours(2),
            ]);

            AuditLog::create([
                'user_id' => $admin?->id,
                'user_name' => $admin?->name ?? 'Administrator Utama',
                'user_nip' => $admin?->nip ?? '198501012010011001',
                'user_email' => $admin?->email ?? 'admin@pemda.go.id',
                'action' => 'LOGIN',
                'module' => 'Autentikasi',
                'description' => 'Berhasil masuk ke portal sistem melalui autentikasi kredensial resmi.',
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'context' => ['method' => 'web_login'],
                'created_at' => now()->subHour(),
            ]);
        }
    }
}
