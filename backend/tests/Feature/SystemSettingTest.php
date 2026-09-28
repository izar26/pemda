<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemSettingTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $staffWithoutPerm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);
        $this->seed(SystemSettingSeeder::class);

        $this->superadmin = User::factory()->create([
            'email' => 'admin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->staffWithoutPerm = User::factory()->create([
            'email' => 'staff@pemda.go.id',
            'status' => 'active',
        ]);
        $staffRole = Role::firstOrCreate(
            ['name' => 'Staff', 'guard_name' => 'web'],
            ['is_system' => false]
        );
        $staffRole->syncPermissions(['users.view']);
        $this->staffWithoutPerm->assignRole('Staff');
    }

    public function test_user_with_permission_can_view_system_settings(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/system-settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'key',
                        'value',
                        'group',
                        'type',
                        'label',
                    ],
                ],
            ]);
    }

    public function test_user_without_permission_cannot_view_system_settings(): void
    {
        $token = $this->staffWithoutPerm->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/system-settings');

        $response->assertStatus(403);
    }

    public function test_user_with_permission_can_update_system_settings(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/system-settings', [
                'settings' => [
                    'app_name' => 'Portal Resmi Pemda Unggul',
                    'session_lifetime_minutes' => 120,
                ],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Pengaturan sistem portal berhasil diperbarui.',
            ]);

        $this->assertDatabaseHas('system_settings', [
            'key' => 'app_name',
            'value' => 'Portal Resmi Pemda Unggul',
        ]);

        // Assert audit log was recorded
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'SETTINGS_UPDATE',
            'module' => 'Pengaturan Sistem',
        ]);
    }

    public function test_user_without_permission_cannot_update_system_settings(): void
    {
        $token = $this->staffWithoutPerm->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/system-settings', [
                'settings' => [
                    'app_name' => 'Perubahan Ilegal',
                ],
            ]);

        $response->assertStatus(403);
    }
}
