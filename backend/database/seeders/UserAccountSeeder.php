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
        // 10 Official Demonstration Accounts matching the specification
        // Password for all demo accounts is standardized to: Password@123
        $accounts = [
            'administrator@pemda.go.id' => [
                'role' => 'Superadmin',
                'status' => 'active',
            ],
            'admin@pemda.go.id' => [
                'role' => 'Admin Office',
                'status' => 'active',
            ],
            'bapperida@pemda.go.id' => [
                'role' => 'Bapperida',
                'status' => 'active',
            ],
            'pengawas@pemda.go.id' => [
                'role' => 'Inspektorat',
                'status' => 'active',
            ],
            'auditor@pemda.go.id' => [
                'role' => 'Auditor',
                'status' => 'active',
            ],
            'opputr@pemda.go.id' => [
                'role' => 'OPD',
                'status' => 'active',
            ],
            'bapperida2@pemda.go.id' => [
                'role' => 'Bapperida',
                'status' => 'active',
            ],
            'pengawas2@pemda.go.id' => [
                'role' => 'Inspektorat',
                'status' => 'active',
            ],
            'auditor2@pemda.go.id' => [
                'role' => 'Auditor',
                'status' => 'active',
            ],
            'opperkim@pemda.go.id' => [
                'role' => 'OPD',
                'status' => 'active',
            ],
        ];

        $defaultPassword = Hash::make('Password@123');

        // Detach roles & deactivate any obsolete prototype accounts not in the 10 official accounts
        $activeAccountEmails = array_keys($accounts);
        $obsoleteUsers = User::whereNotIn('email', $activeAccountEmails)->whereNotNull('password')->get();
        foreach ($obsoleteUsers as $obs) {
            $obs->syncRoles([]);
            $obs->update([
                'password' => null,
                'status' => null,
                'role' => null,
            ]);
        }

        foreach ($accounts as $email => $config) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([
                    'password' => $defaultPassword,
                    'status' => $config['status'],
                    'role' => $config['role'],
                    'failed_login_attempts' => 0,
                    'lockout_until' => null,
                ]);

                // Sync Spatie Role
                $user->syncRoles([$config['role']]);
            }
        }
    }
}
