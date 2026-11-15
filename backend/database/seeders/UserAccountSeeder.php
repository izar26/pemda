<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserAccountSeeder extends Seeder
{
    /**
     * Run the database seeds for provisioned user accounts.
     */
    public function run(): void
    {
        $superadmin = User::updateOrCreate(
            ['email' => 'superadmin@pemda.go.id'],
            [
                'name' => 'Superadmin',
                'nip' => '198001012005011001',
                'phone' => '081234567890',
                'jabatan' => 'Super Administrator',
                'pangkat_gol' => 'Pembina Utama (IV/e)',
                'opd_id' => null,
                'role' => 'Superadmin',
                'status' => 'active',
                'password' => Hash::make('Password@123'),
                'failed_login_attempts' => 0,
                'lockout_until' => null,
            ]
        );

        $superadmin->syncRoles(['Superadmin']);

        // Remove any other users if present to ensure single-account integrity
        $otherUsers = User::where('id', '!=', $superadmin->id)->get();
        foreach ($otherUsers as $user) {
            $user->syncRoles([]);
            $user->delete();
        }
    }
}
