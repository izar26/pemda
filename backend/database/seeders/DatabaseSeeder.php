<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database with realistic and complete datasets across all menus.
     */
    public function run(): void
    {
        // 1. Master Organisasi Perangkat Daerah (OPD, Dinas, Badan, RSUD, Kecamatan)
        $this->call(OpdSeeder::class);

        // 2. Direktori Kepegawaian ASN per Instansi Daerah (Fitur 12 - Manajemen Pegawai)
        $this->call(PegawaiSeeder::class);

        // 3. Matriks Peran & Hak Akses (Fitur 8 - Manajemen Hak Akses / RBAC)
        $this->call(RbacSeeder::class);

        // 4. Akun Pengguna & Aktivasi Peran (Fitur 9 - Manajemen Users)
        $this->call(UserAccountSeeder::class);

        // 5. Konfigurasi Parameter & Keamanan Sistem (Fitur 7 - Pengaturan Sistem)
        $this->call(SystemSettingSeeder::class);

        // 6. Manajemen Konten & Banner Portal (CMS Banner Login & Beranda)
        $this->call(BannerSeeder::class);

        // 7. Master Data Manajemen Risiko & SPIP Terintegrasi (Fitur 10 - Data Master)
        $this->call(MasterDataSeeder::class);

        // 8. Siklus Perencanaan & Periode Penilaian (Fitur 13 - Periode Penilaian)
        $this->call(PeriodePenilaianSeeder::class);

        // 9. Penetapan Konteks Risiko Strategis OPD (Fitur 26 - Form 2B)
        $this->call(KonteksPenilaianSeeder::class);

        // 10. Penetapan Konteks Risiko Operasional OPD (Fitur 26 - Form 2C)
        $this->call(KonteksOperasionalSeeder::class);

        // 11. Log Aktivitas & Audit Keamanan Sistem (Fitur 5 - Log Audit Keamanan)
        $this->call(AuditLogSeeder::class);
    }
}
