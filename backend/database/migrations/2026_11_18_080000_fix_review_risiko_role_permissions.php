<?php

declare(strict_types=1);

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Separate overlapping review_risiko tier permissions across roles
     * to prevent cross-tier privilege escalation and data scoping leaks.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $revocations = [
            'Koordinator Pengawas' => ['review_risiko.approve', 'review_risiko.review_kepala', 'penilaian_risiko.submit'],
            'Inspektorat' => ['review_risiko.approve', 'review_risiko.review_kepala', 'penilaian_risiko.submit'],
            'Evaluator / Reviewer' => ['review_risiko.review_kepala', 'review_risiko.review_pengawas', 'penilaian_risiko.submit'],
            'Auditor' => ['review_risiko.review_kepala', 'review_risiko.review_pengawas', 'penilaian_risiko.submit'],
            'Executive' => ['review_risiko.approve', 'review_risiko.review_pengawas', 'penilaian_risiko.submit'],
            'Kepala OPD' => ['review_risiko.approve', 'review_risiko.review_pengawas', 'penilaian_risiko.submit'],
        ];

        foreach ($revocations as $roleName => $permissions) {
            $role = Role::where('name', $roleName)->where('guard_name', 'web')->first();
            if (! $role) {
                continue;
            }

            foreach ($permissions as $permission) {
                if ($role->hasPermissionTo($permission)) {
                    $role->revokePermissionTo($permission);
                }
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Intentional no-op: restoring over-privileged cross-tier permissions is unsafe.
    }
};
