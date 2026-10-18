<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\SystemSetting;
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
            // Branding Group
            [
                'key' => 'app_logo',
                'value' => null,
                'group' => 'branding',
                'type' => 'string',
                'label' => 'Logo Resmi Aplikasi / Instansi',
                'description' => 'Logo resmi yang tampil pada header aplikasi, sidebar, dan portal login.',
            ],
            [
                'key' => 'app_favicon',
                'value' => null,
                'group' => 'branding',
                'type' => 'string',
                'label' => 'Favicon Tab Browser',
                'description' => 'Ikon kecil pada tab peramban web.',
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
                'key' => 'max_login_attempts',
                'value' => '5',
                'group' => 'security',
                'type' => 'integer',
                'label' => 'Batas Maksimal Percobaan Login',
                'description' => 'Jumlah toleransi kesalahan kata sandi sebelum akun diblokir sementara.',
            ],
        ];

        // Clean up retired security keys if present
        SystemSetting::whereIn('key', ['require_2fa_for_admin', 'maintenance_mode'])->delete();

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
