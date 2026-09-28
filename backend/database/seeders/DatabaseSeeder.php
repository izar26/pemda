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
        // 1. Superadmin PEMDA
        User::updateOrCreate(
            ['email' => 'admin@pemda.go.id'],
            [
                'name' => 'Administrator Utama',
                'nip' => '198501012010011001',
                'phone' => '081234567890',
                'role' => 'superadmin',
                'status' => 'active',
                'password' => Hash::make('Password@123'),
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'failed_login_attempts' => 0,
            ]
        );

        // 2. Seed Roles, Permissions, and assign Superadmin role
        $this->call(RbacSeeder::class);

        // 3. Seed System Settings & Initial Audit Logs
        $this->call(SystemSettingSeeder::class);
    }
}
