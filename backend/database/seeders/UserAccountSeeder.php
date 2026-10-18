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
        // Credentials for demonstration accounts
        // Password for all demo accounts is standardized to: Password@123
        $accounts = [
            'admin@pemda.go.id' => [
                'role' => 'Superadmin',
                'status' => 'active',
            ],
            'admin.office@pemda.go.id' => [
                'role' => 'Admin Office',
                'status' => 'active',
            ],
            'bapperida@pemda.go.id' => [
                'role' => 'Bapperida',
                'status' => 'active',
            ],
            'inspektorat@pemda.go.id' => [
                'role' => 'Inspektorat',
                'status' => 'active',
            ],
            'auditor@pemda.go.id' => [
                'role' => 'Auditor',
                'status' => 'active',
            ],
            'opd.dputr@pemda.go.id' => [
                'role' => 'OPD',
                'status' => 'active',
            ],
            'opd.dinkes@pemda.go.id' => [
                'role' => 'OPD',
                'status' => 'active',
            ],
            'opd.disdik@pemda.go.id' => [
                'role' => 'OPD',
                'status' => 'active',
            ],
            'opd.diskominfo@pemda.go.id' => [
                'role' => 'OPD',
                'status' => 'active',
            ],
            'bupati@pemda.go.id' => [
                'role' => 'Executive',
                'status' => 'active',
            ],
        ];

        $defaultPassword = Hash::make('Password@123');

        foreach ($accounts as $email => $config) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([
                    'password' => $defaultPassword,
                    'status' => $config['status'],
                    'role' => strtolower(str_replace(' ', '_', $config['role'])),
                    'failed_login_attempts' => 0,
                    'lockout_until' => null,
                ]);

                // Sync Spatie Role
                $user->syncRoles([$config['role']]);
            }
        }
    }
}
