<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
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

    public function test_user_with_audit_view_permission_can_list_logs(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/audit-logs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'user_name',
                        'action',
                        'module',
                        'description',
                        'created_at',
                    ],
                ],
                'links',
                'meta',
            ]);
    }

    public function test_user_without_permission_cannot_view_audit_logs(): void
    {
        $token = $this->staffWithoutPerm->createToken('test', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/audit-logs');

        $response->assertStatus(403);
    }
}
