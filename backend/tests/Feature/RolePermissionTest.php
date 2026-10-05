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

    public function test_non_superadmin_cannot_see_superadmin_role(): void
    {
        $roleManager = Role::firstOrCreate(
            ['name' => 'Role Manager', 'guard_name' => 'web'],
            ['description' => 'Pengelola Peran', 'is_system' => false]
        );
        $roleManager->syncPermissions(['roles.view', 'roles.create', 'roles.edit', 'roles.delete']);

        $user = User::factory()->create(['email' => 'role_manager@pemda.go.id', 'status' => 'active']);
        $user->assignRole('Role Manager');
        $token = $user->createToken('test')->plainTextToken;

        $superadminRole = Role::where('name', 'Superadmin')->firstOrFail();

        // 1. List roles: Superadmin role must not be present
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/roles');
        $response->assertStatus(200);
        $roleNames = collect($response->json('data'))->pluck('name')->all();
        $this->assertNotContains('Superadmin', $roleNames);
        $this->assertContains('Role Manager', $roleNames);

        // 2. Direct GET on Superadmin role: must return 404
        $responseShow = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson("/api/roles/{$superadminRole->id}");
        $responseShow->assertStatus(404);

        // 3. Direct PUT on Superadmin role: must return 404
        $responsePut = $this->withHeader('Authorization', 'Bearer ' . $token)->putJson("/api/roles/{$superadminRole->id}", [
            'name' => 'Superadmin',
            'permissions' => ['users.view'],
        ]);
        $responsePut->assertStatus(404);

        // 4. Direct DELETE on Superadmin role: must return 404
        $responseDelete = $this->withHeader('Authorization', 'Bearer ' . $token)->deleteJson("/api/roles/{$superadminRole->id}");
        $responseDelete->assertStatus(404);

        // 5. Creating role named 'Superadmin' must fail validation
        $responseCreate = $this->withHeader('Authorization', 'Bearer ' . $token)->postJson('/api/roles', [
            'name' => 'Superadmin',
            'permissions' => ['users.view'],
        ]);
        $responseCreate->assertStatus(422)->assertJsonValidationErrors(['name']);

        // 6. Superadmin user CAN still see Superadmin role in list
        app('auth')->forgetGuards();
        $superadminToken = $this->superadmin->createToken('test')->plainTextToken;
        $responseSuper = $this->withHeader('Authorization', 'Bearer ' . $superadminToken)->getJson('/api/roles');
        $responseSuper->assertStatus(200);
        $superRoleNames = collect($responseSuper->json('data'))->pluck('name')->all();
        $this->assertContains('Superadmin', $superRoleNames);
    }

    public function test_non_superadmin_cannot_update_own_role(): void
    {
        $customRole = Role::firstOrCreate(
            ['name' => 'Operator', 'guard_name' => 'web'],
            ['description' => 'Operator sistem', 'is_system' => false]
        );
        $customRole->syncPermissions(['roles.view', 'roles.edit']);

        $user = User::factory()->create(['email' => 'operator@pemda.go.id', 'status' => 'active']);
        $user->assignRole('Operator');
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $customRole->id, [
                'name' => 'Operator',
                'description' => 'Mencoba mengedit role sendiri',
                'permissions' => ['roles.view', 'roles.edit', 'users.view'],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_non_superadmin_cannot_grant_role_management_permissions(): void
    {
        $managerRole = Role::firstOrCreate(
            ['name' => 'Sub Manager', 'guard_name' => 'web'],
            ['description' => 'Manajer bawahan', 'is_system' => false]
        );
        $managerRole->syncPermissions(['roles.view', 'roles.create', 'roles.edit']);

        $user = User::factory()->create(['email' => 'submanager@pemda.go.id', 'status' => 'active']);
        $user->assignRole('Sub Manager');
        $token = $user->createToken('test')->plainTextToken;

        // 1. Cannot create role with roles.* permission
        $responseCreate = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/roles', [
                'name' => 'Junior Manager',
                'description' => 'Testing role escalation',
                'permissions' => ['roles.view', 'users.view'],
            ]);

        $responseCreate->assertStatus(422)
            ->assertJsonValidationErrors(['permissions']);

        // 2. Cannot update another role with roles.* permission
        $targetRole = Role::firstOrCreate(
            ['name' => 'Target Role', 'guard_name' => 'web'],
            ['description' => 'Role target', 'is_system' => false]
        );

        $responseUpdate = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $targetRole->id, [
                'name' => 'Target Role',
                'description' => 'Testing escalation via update',
                'permissions' => ['roles.edit', 'users.view'],
            ]);

        $responseUpdate->assertStatus(422)
            ->assertJsonValidationErrors(['permissions']);

        // 3. CAN update another role with non-role permissions
        $responseValid = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $targetRole->id, [
                'name' => 'Target Role',
                'description' => 'Valid update',
                'permissions' => ['users.view'],
            ]);

        $responseValid->assertStatus(200);
    }
}

