<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $staffRole = Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web'], ['is_system' => false]);
        $staffRole->syncPermissions(['users.view']);
        Role::firstOrCreate(['name' => 'Admin OPD', 'guard_name' => 'web'], ['is_system' => false]);
        Role::firstOrCreate(['name' => 'Verifikator', 'guard_name' => 'web'], ['is_system' => false]);

        $this->superadmin = User::factory()->create([
            'name' => 'Super Administrator',
            'email' => 'superadmin@pemda.go.id',
            'nip' => '198001012005011001',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->staff = User::factory()->create([
            'name' => 'Staf Pegawai',
            'email' => 'staff@pemda.go.id',
            'nip' => '199501012020011002',
            'status' => 'active',
        ]);
        $this->staff->assignRole('Staff');
    }

    protected function getSuperadminToken(): string
    {
        return $this->superadmin->createToken('test', ['*'])->plainTextToken;
    }

    protected function getStaffToken(): string
    {
        return $this->staff->createToken('test', ['*'])->plainTextToken;
    }

    public function test_user_with_permission_can_list_users(): void
    {
        $token = $this->getSuperadminToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'email',
                        'nip',
                        'phone',
                        'role',
                        'roles',
                        'permissions',
                        'status',
                        'two_factor_enabled',
                        'created_at',
                    ],
                ],
                'links',
                'meta',
            ]);
    }

    public function test_user_can_filter_and_search_users(): void
    {
        $token = $this->getSuperadminToken();

        // Search by name
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/users?search=Super');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Super Administrator', $response->json('data.0.name'));

        // Filter by role
        $responseRole = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/users?role=Staff');

        $responseRole->assertStatus(200);
        $this->assertCount(1, $responseRole->json('data'));
        $this->assertEquals('Staf Pegawai', $responseRole->json('data.0.name'));
    }

    public function test_admin_can_create_user_with_role_and_nip(): void
    {
        $token = $this->getSuperadminToken();

        $payload = [
            'name' => 'Budi Santoso, S.Kom',
            'email' => 'budi.santoso@pemda.go.id',
            'nip' => '199003152015031003',
            'phone' => '081234567890',
            'role' => 'Admin OPD',
            'status' => 'active',
            'password' => 'Password@123',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/users', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Budi Santoso, S.Kom')
            ->assertJsonPath('data.email', 'budi.santoso@pemda.go.id')
            ->assertJsonPath('data.nip', '199003152015031003')
            ->assertJsonPath('data.role', 'Admin OPD');

        $createdUser = User::where('email', 'budi.santoso@pemda.go.id')->first();
        $this->assertNotNull($createdUser);
        $this->assertTrue($createdUser->hasRole('Admin OPD'));
    }

    public function test_create_user_validates_required_fields_and_uniqueness(): void
    {
        $token = $this->getSuperadminToken();

        // Duplicate email & duplicate NIP
        $payload = [
            'name' => 'Duplicate Test',
            'email' => 'superadmin@pemda.go.id',
            'nip' => '198001012005011001',
            'role' => 'Staff',
            'password' => 'Short1!',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/users', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'nip', 'password']);
    }

    public function test_admin_can_update_user_details(): void
    {
        $token = $this->getSuperadminToken();

        $payload = [
            'name' => 'Staf Pegawai Senior',
            'email' => 'staff.senior@pemda.go.id',
            'nip' => '199501012020011002',
            'phone' => '089988776655',
            'role' => 'Verifikator',
            'status' => 'active',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/users/{$this->staff->id}", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Staf Pegawai Senior')
            ->assertJsonPath('data.role', 'Verifikator');

        $this->staff->refresh();
        $this->assertEquals('Staf Pegawai Senior', $this->staff->name);
        $this->assertTrue($this->staff->hasRole('Verifikator'));
    }

    public function test_admin_cannot_demote_the_last_superadmin(): void
    {
        $token = $this->getSuperadminToken();

        $payload = [
            'name' => 'Super Administrator',
            'email' => 'superadmin@pemda.go.id',
            'nip' => '198001012005011001',
            'role' => 'Staff', // attempting to demote last superadmin
            'status' => 'active',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/users/{$this->superadmin->id}", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_admin_cannot_deactivate_or_delete_themselves(): void
    {
        $token = $this->getSuperadminToken();

        // Attempting to deactivate self
        $responseDeactivate = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/users/{$this->superadmin->id}", [
                'name' => 'Super Administrator',
                'email' => 'superadmin@pemda.go.id',
                'role' => 'Superadmin',
                'status' => 'inactive',
            ]);

        $responseDeactivate->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // Attempting to delete self
        $responseDelete = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson("/api/users/{$this->superadmin->id}");

        $responseDelete->assertStatus(422)
            ->assertJsonValidationErrors(['user']);
    }

    public function test_admin_can_reset_user_2fa(): void
    {
        $token = $this->getSuperadminToken();

        // Enable 2FA on staff
        $this->staff->update([
            'two_factor_secret' => 'encrypted_secret_sample',
            'two_factor_recovery_codes' => ['code1', 'code2'],
            'two_factor_confirmed_at' => now(),
        ]);
        $this->assertTrue($this->staff->hasTwoFactorEnabled());

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/users/{$this->staff->id}/reset-2fa");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Autentikasi dua faktor (2FA) untuk pegawai berhasil direset.');

        $this->staff->refresh();
        $this->assertFalse($this->staff->hasTwoFactorEnabled());
        $this->assertNull($this->staff->two_factor_secret);
    }

    public function test_admin_can_delete_user(): void
    {
        $token = $this->getSuperadminToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson("/api/users/{$this->staff->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $this->staff->id]);
    }
}
