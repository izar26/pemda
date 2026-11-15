<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database with core required datasets.
     */
    public function run(): void
    {
        // 1. Master Organisasi Perangkat Daerah (OPD, Dinas, Badan, RSUD, Kecamatan)
        $this->call(OpdSeeder::class);

        // 2. Matriks Peran & Hak Akses (RBAC Spatie)
        $this->call(RbacSeeder::class);

        // 3. Akun Pengguna Superadmin Sistem
        $this->call(UserAccountSeeder::class);

        // 4. Konfigurasi Parameter & Keamanan Sistem
        $this->call(SystemSettingSeeder::class);

        // 5. Manajemen Konten & Banner Portal (Login & Beranda Publik)
        $this->call(BannerSeeder::class);

        // 6. Master Data Manajemen Risiko & SPIP Terintegrasi
        $this->call(MasterDataSeeder::class);
    }
}
