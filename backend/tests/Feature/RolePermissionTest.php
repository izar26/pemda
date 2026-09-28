<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->superadmin = User::factory()->create([
            'email' => 'admin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->staff = User::factory()->create([
            'email' => 'staff@pemda.go.id',
            'status' => 'active',
        ]);
        $staffRole = Role::firstOrCreate(
            ['name' => 'Staff', 'guard_name' => 'web'],
            ['description' => 'Pegawai staf', 'is_system' => false]
        );
        $staffRole->syncPermissions(['users.view']);
        $this->staff->assignRole('Staff');
    }

    public function test_authenticated_user_can_list_roles(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/roles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'is_system',
                        'users_count',
                        'permissions_count',
                        'permissions',
                    ],
                ],
            ]);
    }

    public function test_can_list_permissions_grouped_by_module(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/permissions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'permissions' => [
                    'Manajemen Pengguna',
                    'Manajemen Peran & Izin',
                    'Keamanan & Log Audit',
                    'Pengaturan Sistem',
                ],
            ]);
    }

    public function test_can_create_new_custom_role_with_permissions(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/roles', [
                'name' => 'Auditor Inspektorat',
                'description' => 'Petugas audit internal pengawasan tata kelola',
                'permissions' => ['users.view', 'audit.view'],
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Peran (role) baru berhasil ditambahkan.',
                'role' => [
                    'name' => 'Auditor Inspektorat',
                    'is_system' => false,
                    'permissions_count' => 2,
                ],
            ]);

        $this->assertDatabaseHas('roles', [
            'name' => 'Auditor Inspektorat',
            'is_system' => false,
        ]);
    }

    public function test_can_update_custom_role(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $role = Role::create([
            'name' => 'Bendahara Pengeluaran',
            'guard_name' => 'web',
            'description' => 'Pengelola kas belanja dinas',
            'is_system' => false,
        ]);
        $role->syncPermissions(['users.view']);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $role->id, [
                'name' => 'Bendahara Pengeluaran Pembantu',
                'description' => 'Pengelola kas pembantu dinas',
                'permissions' => ['users.view', 'audit.view'],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Peran (role) berhasil diperbarui.',
                'role' => [
                    'name' => 'Bendahara Pengeluaran Pembantu',
                    'permissions_count' => 2,
                ],
            ]);
    }

    public function test_can_create_role_with_zero_permissions(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/roles', [
                'name' => 'Peran Kosong',
                'description' => 'Peran tanpa hak akses',
                'permissions' => [],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('role.permissions_count', 0);

        $this->assertDatabaseHas('roles', ['name' => 'Peran Kosong']);
    }

    public function test_can_update_role_with_zero_permissions(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $role = Role::create([
            'name' => 'Peran Akan Dikosongkan',
            'guard_name' => 'web',
            'is_system' => false,
        ]);
        $role->syncPermissions(['users.view']);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $role->id, [
                'name' => 'Peran Akan Dikosongkan',
                'permissions' => [],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('role.permissions_count', 0);

        $role->refresh();
        $this->assertCount(0, $role->permissions);
    }

    public function test_cannot_rename_system_role(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $superadminRole = Role::where('name', 'Superadmin')->firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $superadminRole->id, [
                'name' => 'Nama Lain Superadmin',
                'description' => 'Deskripsi baru',
                'permissions' => ['users.view'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_cannot_delete_system_role(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $superadminRole = Role::where('name', 'Superadmin')->firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/roles/' . $superadminRole->id);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_cannot_delete_role_assigned_to_users(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $customRole = Role::create([
            'name' => 'Pranata Komputer',
            'guard_name' => 'web',
            'is_system' => false,
        ]);
        $this->staff->assignRole($customRole);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/roles/' . $customRole->id);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_can_delete_unassigned_custom_role(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $customRole = Role::create([
            'name' => 'Peran Sementara',
            'guard_name' => 'web',
            'is_system' => false,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/roles/' . $customRole->id);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Peran berhasil dihapus.',
            ]);

        $this->assertDatabaseMissing('roles', [
            'name' => 'Peran Sementara',
        ]);
    }

    public function test_user_without_permission_cannot_create_role(): void
    {
        $staffToken = $this->staff->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $staffToken)
            ->postJson('/api/roles', [
                'name' => 'Peran Ilegal',
                'permissions' => ['users.view'],
            ]);

        $response->assertStatus(403);
    }

    public function test_user_without_permission_cannot_update_role(): void
    {
        $staffToken = $this->staff->createToken('test', ['*'])->plainTextToken;

        $customRole = Role::create([
            'name' => 'Peran Kustom Uji',
            'guard_name' => 'web',
            'is_system' => false,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $staffToken)
            ->putJson('/api/roles/' . $customRole->id, [
                'name' => 'Nama Baru Uji',
                'permissions' => ['users.view'],
            ]);

        $response->assertStatus(403);
    }

    public function test_user_without_permission_cannot_delete_role(): void
    {
        $staffToken = $this->staff->createToken('test', ['*'])->plainTextToken;

        $customRole = Role::create([
            'name' => 'Peran Kustom Hapus',
            'guard_name' => 'web',
            'is_system' => false,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $staffToken)
            ->deleteJson('/api/roles/' . $customRole->id);

        $response->assertStatus(403);
    }

    public function test_cannot_modify_superadmin_role_permissions(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $superadminRole = Role::where('name', 'Superadmin')->firstOrFail();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $superadminRole->id, [
                'name' => 'Superadmin',
                'description' => 'Mencoba hapus hak akses',
                'permissions' => ['users.view'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }
}

