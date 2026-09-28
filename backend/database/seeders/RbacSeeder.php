<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define Master Permissions grouped by module
        $permissionGroups = [
            'Manajemen Pengguna' => [
                ['name' => 'users.view', 'description' => 'Melihat daftar dan profil pegawai'],
                ['name' => 'users.create', 'description' => 'Membuat akun pegawai baru'],
                ['name' => 'users.edit', 'description' => 'Mengubah data dan status pegawai'],
                ['name' => 'users.delete', 'description' => 'Menghapus atau menonaktifkan akun pegawai'],
                ['name' => 'users.reset_2fa', 'description' => 'Mereset Google Authenticator akun pegawai'],
            ],
            'Manajemen Peran & Izin' => [
                ['name' => 'roles.view', 'description' => 'Melihat daftar peran dan hak akses'],
                ['name' => 'roles.create', 'description' => 'Membuat peran/role baru'],
                ['name' => 'roles.edit', 'description' => 'Mengubah izin pada peran yang ada'],
                ['name' => 'roles.delete', 'description' => 'Menghapus peran kustom'],
            ],
            'Keamanan & Log Audit' => [
                ['name' => 'audit.view', 'description' => 'Melihat riwayat login dan log audit keamanan'],
            ],
            'Pengaturan Sistem' => [
                ['name' => 'settings.view', 'description' => 'Melihat pengaturan sistem portal'],
                ['name' => 'settings.edit', 'description' => 'Mengubah konfigurasi portal'],
            ],
        ];

        $createdPermissions = [];
        foreach ($permissionGroups as $group => $permissions) {
            foreach ($permissions as $perm) {
                $permission = Permission::firstOrCreate(
                    ['name' => $perm['name'], 'guard_name' => 'web'],
                    [
                        'group' => $group,
                        'description' => $perm['description'],
                    ]
                );
                $createdPermissions[$perm['name']] = $permission;
            }
        }

        // 2. Define Initial Role: Only Superadmin (Sole System Role)
        $superadminRole = Role::firstOrCreate(
            ['name' => 'Superadmin', 'guard_name' => 'web'],
            [
                'description' => 'Administrator tertinggi dengan akses tanpa batas ke seluruh modul portal pemda.',
                'is_system' => true,
            ]
        );
        $superadminRole->syncPermissions(Permission::all());

        // 3. Assign Superadmin Role to Default Admin User
        $admin = User::where('email', 'admin@pemda.go.id')->first();
        if ($admin) {
            $admin->syncRoles(['Superadmin']);
        }
    }
}
