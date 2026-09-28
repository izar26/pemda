<?php

declare(strict_types=1);

namespace App\Services\Rbac;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

class RoleService
{
    /**
     * List all roles with counts and permissions.
     *
     * @return Collection<int, Role>
     */
    public function listRoles(): Collection
    {
        return Role::with(['permissions'])
            ->withCount(['users', 'permissions'])
            ->orderBy('is_system', 'desc')
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Get single role details.
     */
    public function getRole(Role $role): Role
    {
        return $role->load(['permissions'])->loadCount(['users', 'permissions']);
    }

    /**
     * Create a new custom role with assigned permissions.
     *
     * @param list<string> $permissions
     */
    public function createRole(string $name, ?string $description, array $permissions): Role
    {
        $role = Role::create([
            'name' => trim($name),
            'guard_name' => 'web',
            'description' => $description ? trim($description) : null,
            'is_system' => false,
        ]);

        $role->syncPermissions($permissions);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return $this->getRole($role);
    }

    /**
     * Update existing role.
     *
     * @param list<string> $permissions
     *
     * @throws ValidationException
     */
    public function updateRole(Role $role, string $name, ?string $description, array $permissions): Role
    {
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

        $role->update([
            'name' => $cleanName,
            'description' => $description ? trim($description) : null,
        ]);

        $role->syncPermissions($permissions);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return $this->getRole($role);
    }

    /**
     * Delete custom role safely.
     *
     * @throws ValidationException
     */
    public function deleteRole(Role $role): void
    {
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
