<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Rbac\StoreRoleRequest;
use App\Http\Requests\Rbac\UpdateRoleRequest;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Services\Export\ExcelExportService;
use App\Services\Rbac\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RoleController extends Controller
{
    public function __construct(
        protected RoleService $roleService
    ) {}

    /**
     * Export Roles & Permissions matrix data to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        $user = $request->user();
        if (!$user->can('roles.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data peran dan izin.');
        }

        $roles = $this->roleService->listRoles($user);

        $headers = [
            'No',
            'Nama Peran (Role)',
            'Deskripsi Peran',
            'Kategori Peran',
            'Jumlah Hak Akses (Permissions)',
            'Daftar Hak Akses Sistem',
            'Jumlah Pegawai Pengguna',
            'Tanggal Dibuat',
        ];

        $generator = function () use ($roles) {
            $no = 1;
            foreach ($roles as $role) {
                $permissionNames = $role->permissions->pluck('name')->implode(', ');

                yield [
                    $no++,
                    $role->name,
                    $role->description ?? '-',
                    $role->is_system ? 'Sistem Bawaan' : 'Kustom OPD',
                    $role->permissions_count ?? $role->permissions->count(),
                    $permissionNames !== '' ? $permissionNames : 'Tidak ada izin',
                    $role->users_count ?? 0,
                    $role->created_at ? $role->created_at->format('d/m/Y H:i') : '-',
                ];
            }
        };

        return $exportService->streamExport(
            filename: 'Data_Peran_dan_Hak_Akses_PEMDA',
            title: 'LAPORAN REKAPITULASI PERAN DAN MATRIKS HAK AKSES SISTEM',
            headers: $headers,
            rows: $generator()
        );
    }

    /**
     * Get all roles.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        if (
            !$user->can('roles.view') &&
            !$user->can('users.view') &&
            !$user->can('users.create') &&
            !$user->can('users.edit')
        ) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat daftar peran.');
        }

        $roles = $this->roleService->listRoles($user);

        return RoleResource::collection($roles);
    }

    /**
     * Get single role details.
     */
    public function show(Request $request, Role $role): RoleResource
    {
        if (!$request->user()->can('roles.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat detail peran.');
        }

        return new RoleResource($this->roleService->getRole($role, $request->user()));
    }

    /**
     * Create a new role.
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roleService->createRole(
            name: $request->validated('name'),
            description: $request->validated('description'),
            permissions: $request->validated('permissions'),
            currentUser: $request->user()
        );

        return response()->json([
            'message' => 'Peran (role) baru berhasil ditambahkan.',
            'role' => new RoleResource($role),
        ], 201);
    }

    /**
     * Update an existing role.
     */
    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $updated = $this->roleService->updateRole(
            role: $role,
            name: $request->validated('name'),
            description: $request->validated('description'),
            permissions: $request->validated('permissions'),
            currentUser: $request->user()
        );

        return response()->json([
            'message' => 'Peran (role) berhasil diperbarui.',
            'role' => new RoleResource($updated),
        ]);
    }

    /**
     * Delete a role.
     */
    public function destroy(Request $request, Role $role): JsonResponse
    {
        if (!$request->user()->can('roles.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus peran.');
        }

        $this->roleService->deleteRole($role, $request->user());

        return response()->json([
            'message' => 'Peran berhasil dihapus.',
        ]);
    }

    /**
     * Get all master permissions grouped by module.
     */
    public function permissions(Request $request): JsonResponse
    {
        $user = $request->user();
        if (
            !$user->can('roles.view') &&
            !$user->can('roles.create') &&
            !$user->can('roles.edit')
        ) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat daftar hak akses.');
        }

        $permissions = Permission::all()->groupBy('group');

        $result = [];
        foreach ($permissions as $group => $perms) {
            $result[$group] = PermissionResource::collection($perms);
        }

        return response()->json([
            'permissions' => $result,
        ]);
    }
}
