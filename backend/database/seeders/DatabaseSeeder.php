<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed OPDs (Master Organisasi Perangkat Daerah)
        $this->call(OpdSeeder::class);

        // 2. Superadmin PEMDA
        $sekda = \App\Models\Opd::where('kode', 'Sekda')->first();
        User::updateOrCreate(
            ['email' => 'admin@pemda.go.id'],
            [
                'name' => 'Administrator Utama',
                'nip' => '198501012010011001',
                'phone' => '081234567890',
                'opd_id' => $sekda?->id,
                'jabatan' => 'Pranata Komputer Ahli Pertama',
                'pangkat_gol' => 'Penata Muda (III/a)',
                'role' => 'superadmin',
                'status' => 'active',
                'password' => Hash::make('Password@123'),
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'failed_login_attempts' => 0,
            ]
        );

        // 3. Seed Roles, Permissions, and assign Superadmin role
        $this->call(RbacSeeder::class);

        // 4. Seed System Settings & Initial Audit Logs
        $this->call(SystemSettingSeeder::class);

        // 5. Seed Master Data Manajemen Risiko & SPIP
        $this->call(MasterDataSeeder::class);

        // 6. Seed Periode Penilaian (Perencanaan Kinerja)
        $this->call(PeriodePenilaianSeeder::class);

        // 7. Seed Data Tujuan Renstra OPD (Fitur 14)
        $this->call(TujuanPenilaianSeeder::class);

        // 8. Seed Data Sasaran Renstra OPD (Fitur 15)
        $this->call(SasaranPenilaianSeeder::class);

        // 9. Seed Data IKU & Indikator Renstra OPD (Fitur 16 & 17)
        $this->call(IndikatorPenilaianSeeder::class);

        // 10. Seed Penetapan Konteks Risiko Strategis OPD (Fitur 26 - Form 2B)
        $this->call(KonteksPenilaianSeeder::class);

        // 11. Seed Penetapan Konteks Risiko Operasional OPD (Fitur 26 - Form 2C)
        $this->call(KonteksOperasionalSeeder::class);
    }
}

