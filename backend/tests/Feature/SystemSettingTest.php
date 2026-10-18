<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_guest_can_fetch_public_app_config(): void
    {
        $response = $this->getJson('/api/public/app-config');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'app_name',
                    'instance_name',
                    'app_logo_url',
                    'app_favicon_url',
                    'contact_email',
                    'contact_phone',
                    'session_lifetime_minutes',
                    'max_login_attempts',
                ],
            ]);
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

        // Assert public config is updated
        $publicRes = $this->getJson('/api/public/app-config');
        $publicRes->assertStatus(200)
            ->assertJsonPath('data.app_name', 'Portal Resmi Pemda Unggul');
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

    public function test_authorized_user_can_upload_and_delete_logo(): void
    {
        Storage::fake('public');

        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;
        $file = UploadedFile::fake()->image('logo.png', 200, 200);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/system-settings/logo', [
                'logo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'key',
                    'value',
                    'url',
                ],
            ]);

        $path = $response->json('data.value');
        Storage::disk('public')->assertExists($path);

        $this->assertDatabaseHas('system_settings', [
            'key' => 'app_logo',
            'value' => $path,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'LOGO_UPDATE',
            'module' => 'Pengaturan Sistem',
        ]);

        // Delete logo
        $deleteRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/system-settings/logo');

        $deleteRes->assertStatus(200);
        Storage::disk('public')->assertMissing($path);

        $this->assertDatabaseHas('system_settings', [
            'key' => 'app_logo',
            'value' => null,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'LOGO_DELETE',
            'module' => 'Pengaturan Sistem',
        ]);
    }

    public function test_unauthorized_user_cannot_upload_logo(): void
    {
        Storage::fake('public');

        $token = $this->staffWithoutPerm->createToken('test', ['*'])->plainTextToken;
        $file = UploadedFile::fake()->image('logo.png', 100, 100);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/system-settings/logo', [
                'logo' => $file,
            ]);

        $response->assertStatus(403);
    }

    public function test_upload_rejects_invalid_file_type(): void
    {
        Storage::fake('public');

        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;
        $fakePdf = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/system-settings/logo', [
                'logo' => $fakePdf,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);
    }

    public function test_update_settings_validates_value_bounds_and_unknown_keys(): void
    {
        $token = $this->superadmin->createToken('test', ['*'])->plainTextToken;

        // 1. Invalid email
        $resEmail = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/system-settings', [
                'settings' => [
                    'contact_email' => 'bukan-email-resmi',
                ],
            ]);
        $resEmail->assertStatus(422)->assertJsonValidationErrors(['settings.contact_email']);

        // 2. Session lifetime out of range (< 5 minutes)
        $resSession = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/system-settings', [
                'settings' => [
                    'session_lifetime_minutes' => 2,
                ],
            ]);
        $resSession->assertStatus(422)->assertJsonValidationErrors(['settings.session_lifetime_minutes']);

        // 3. Max login attempts out of range (> 20)
        $resAttempts = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/system-settings', [
                'settings' => [
                    'max_login_attempts' => 99,
                ],
            ]);
        $resAttempts->assertStatus(422)->assertJsonValidationErrors(['settings.max_login_attempts']);

        // 4. Unknown/unregistered setting key
        $resUnknown = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/system-settings', [
                'settings' => [
                    'injected_malicious_key' => 'attack',
                ],
            ]);
        $resUnknown->assertStatus(422)->assertJsonValidationErrors(['settings.injected_malicious_key']);
    }
}
