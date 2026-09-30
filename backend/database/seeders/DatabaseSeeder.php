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
    }
}

