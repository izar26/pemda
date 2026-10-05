<?php

declare(strict_types=1);

namespace App\Services\Rbac;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

class RoleService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * List all roles with counts and permissions.
     *
     * @return Collection<int, Role>
     */
    public function listRoles(?User $currentUser = null): Collection
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $query = Role::with(['permissions'])
            ->withCount(['users', 'permissions'])
            ->orderBy('is_system', 'desc')
            ->orderBy('name', 'asc');

        // Ghost filter: non-superadmin users must not see Superadmin role
        if (!$user?->hasRole('Superadmin')) {
            $query->where('name', '!=', 'Superadmin');
        }

        return $query->get();
    }

    /**
     * Get single role details.
     */
    public function getRole(Role $role, ?User $currentUser = null): Role
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        if ($role->name === 'Superadmin' && !$user?->hasRole('Superadmin')) {
            abort(404, 'Data peran tidak ditemukan.');
        }

        return $role->load(['permissions'])->loadCount(['users', 'permissions']);
    }

    /**
     * Create a new custom role with assigned permissions.
     *
     * @param list<string> $permissions
     */
    public function createRole(string $name, ?string $description, array $permissions, ?User $currentUser = null): Role
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $cleanName = trim($name);
        if (strtolower($cleanName) === 'superadmin') {
            throw ValidationException::withMessages([
                'name' => ['Nama peran tersebut tidak dapat digunakan.'],
            ]);
        }

        // Safeguard: Non-superadmin cannot grant roles.* permissions
        if ($user && !$user->hasRole('Superadmin')) {
            $hasRolePermissions = collect($permissions)->contains(function ($perm) {
                return str_starts_with((string) $perm, 'roles.');
            });
            if ($hasRolePermissions) {
                throw ValidationException::withMessages([
                    'permissions' => ['Hanya Superadmin yang memiliki wewenang untuk memberikan hak akses pengelolaan peran (roles).'],
                ]);
            }
        }

        $role = Role::create([
            'name' => $cleanName,
            'guard_name' => 'web',
            'description' => $description ? trim($description) : null,
            'is_system' => false,
        ]);

        $role->syncPermissions($permissions);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        if (!empty($permissions)) {
            $this->auditLogService->log(
                action: 'ROLE_PERMISSIONS_UPDATED',
                module: 'Peran & Izin',
                description: "Menetapkan " . count($permissions) . " izin akses pada peran baru '{$role->name}'",
                context: [
                    'role_id' => $role->id,
                    'role_name' => $role->name,
                    'assigned_permissions' => $permissions,
                ],
                auditableType: Role::class,
                auditableId: $role->id
            );
        }

        return $this->getRole($role);
    }

    /**
     * Update existing role.
     *
     * @param list<string> $permissions
     *
     * @throws ValidationException
     */
    public function updateRole(Role $role, string $name, ?string $description, array $permissions, ?User $currentUser = null): Role
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        if ($role->name === 'Superadmin' && !$user?->hasRole('Superadmin')) {
            abort(404, 'Data peran tidak ditemukan.');
        }

        // Safeguard: Non-superadmin cannot modify their own role permissions (prevent self-privilege escalation)
        if ($user && !$user->hasRole('Superadmin') && $user->hasRole($role->name)) {
            throw ValidationException::withMessages([
                'role' => ['Anda tidak dapat mengubah hak akses pada peran Anda sendiri demi keamanan sistem.'],
            ]);
        }

        // Safeguard: Non-superadmin cannot grant roles.* permissions
        if ($user && !$user->hasRole('Superadmin')) {
            $hasRolePermissions = collect($permissions)->contains(function ($perm) {
                return str_starts_with((string) $perm, 'roles.');
            });
            if ($hasRolePermissions) {
                throw ValidationException::withMessages([
                    'permissions' => ['Hanya Superadmin yang memiliki wewenang untuk memberikan hak akses pengelolaan peran (roles).'],
                ]);
            }
        }

        $cleanName = trim($name);

        // Safeguard: do not allow renaming or modifying system roles like 'Superadmin'
        if ($role->is_system) {
            if ($role->name !== $cleanName) {
                throw ValidationException::withMessages([
                    'name' => ['Nama peran sistem bawaan (' . $role->name . ') tidak dapat diubah.'],
                ]);
            }

            if ($role->name === 'Superadmin') {
                throw ValidationException::withMessages([
                    'role' => ['Kewenangan peran sistem bawaan (' . $role->name . ') bersifat permanen dan tidak dapat diubah.'],
                ]);
            }
        }

        $oldPermissions = $role->permissions()->pluck('name')->sort()->values()->all();
        $newPermissions = collect($permissions)->sort()->values()->all();

        $added = array_values(array_diff($newPermissions, $oldPermissions));
        $removed = array_values(array_diff($oldPermissions, $newPermissions));

        $role->update([
            'name' => $cleanName,
            'description' => $description ? trim($description) : null,
        ]);

        $role->syncPermissions($permissions);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        if (!empty($added) || !empty($removed)) {
            $this->auditLogService->log(
                action: 'ROLE_PERMISSIONS_UPDATED',
                module: 'Peran & Izin',
                description: "Memperbarui izin akses untuk peran '{$role->name}' (" . count($added) . " ditambahkan, " . count($removed) . " dicabut)",
                context: [
                    'role_id' => $role->id,
                    'role_name' => $role->name,
                    'added_permissions' => $added,
                    'removed_permissions' => $removed,
                ],
                auditableType: Role::class,
                auditableId: $role->id
            );
        }

        return $this->getRole($role);
    }

    /**
     * Delete custom role safely.
     *
     * @throws ValidationException
     */
    public function deleteRole(Role $role, ?User $currentUser = null): void
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        if ($role->name === 'Superadmin' && !$user?->hasRole('Superadmin')) {
            abort(404, 'Data peran tidak ditemukan.');
        }

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['Peran sistem bawaan (' . $role->name . ') tidak dapat dihapus.'],
            ]);
        }

        $assignedCount = $role->users()->count();
        if ($assignedCount > 0) {
            throw ValidationException::withMessages([
                'role' => ['Peran ini masih digunakan oleh ' . $assignedCount . ' pegawai. Alihkan peran pegawai terlebih dahulu sebelum menghapus.'],
            ]);
        }

        $role->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Get all master permissions grouped by module.
     *
     * @return array<string, list<Permission>>
     */
    public function getGroupedPermissions(): array
    {
        return Permission::all()
            ->groupBy('group')
            ->toArray();
    }
}
