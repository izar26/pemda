<?php

declare(strict_types=1);

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('permissions') || !Schema::hasTable('roles')) {
            return;
        }

        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create or ensure 'laporan.view' permission exists
        $viewPermission = Permission::firstOrCreate(
            ['name' => 'laporan.view', 'guard_name' => 'web'],
            [
                'group' => 'Pelaporan & Dokumen',
                'description' => 'Melihat lembar dan pusat laporan risiko OPD (Fitur 26 & 31)',
            ]
        );

        // 2. Create or ensure 'laporan.export' permission exists
        $exportPermission = Permission::firstOrCreate(
            ['name' => 'laporan.export', 'guard_name' => 'web'],
            [
                'group' => 'Pelaporan & Dokumen',
                'description' => 'Mengekspor laporan risiko ke berkas Excel (.xlsx) dan Cetak PDF (Fitur 26 & 31)',
            ]
        );

        // 3. Assign to default operational roles without touching any of their existing permissions
        $targetRoles = [
            'Superadmin',
            'Admin Office',
            'Bapperida',
            'OPD',
            'Inspektorat',
            'Auditor',
            'Executive',
        ];

        $roles = Role::whereIn('name', $targetRoles)->get();
        foreach ($roles as $role) {
            $role->givePermissionTo([$viewPermission, $exportPermission]);
        }

        // Reset cache again
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('permissions')) {
            return;
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::whereIn('name', ['laporan.view', 'laporan.export'])->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
