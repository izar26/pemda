<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\LoginLog;
use App\Models\Opd;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class UuidV7Test extends TestCase
{
    use RefreshDatabase;

    public function test_user_id_is_valid_uuid_v7(): void
    {
        $user = User::factory()->create([
            'email' => 'uuid_test@pemda.go.id',
            'status' => 'active',
        ]);

        $this->assertTrue(Str::isUuid($user->id), 'User ID must be a valid UUID');

        // UUID format: 8-4-4-4-12 -> version digit is at position 14 (0-indexed)
        $cleanId = str_replace('-', '', $user->id);
        $versionDigit = $cleanId[12]; // In 32-hex format, version is hex digit 13 (index 12)
        $this->assertSame('7', $versionDigit, "User ID must be UUID version 7, got version {$versionDigit}");
    }

    public function test_opd_id_is_valid_uuid_v7(): void
    {
        $opd = Opd::create([
            'nama' => 'Dinas Komunikasi dan Informatika',
            'kode' => 'DISKOMINFO',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->assertTrue(Str::isUuid($opd->id), 'OPD ID must be a valid UUID');
        $cleanId = str_replace('-', '', $opd->id);
        $versionDigit = $cleanId[12];
        $this->assertSame('7', $versionDigit, "OPD ID must be UUID version 7, got version {$versionDigit}");
    }

    public function test_audit_log_id_is_valid_uuid_v7(): void
    {
        $log = AuditLog::create([
            'action' => 'TEST_ACTION',
            'module' => 'Keamanan',
            'description' => 'Test log description',
            'created_at' => now(),
        ]);

        $this->assertTrue(Str::isUuid($log->id), 'AuditLog ID must be a valid UUID');
        $cleanId = str_replace('-', '', $log->id);
        $versionDigit = $cleanId[12];
        $this->assertSame('7', $versionDigit, "AuditLog ID must be UUID version 7, got version {$versionDigit}");
    }

    public function test_login_log_id_is_valid_uuid_v7(): void
    {
        $log = LoginLog::create([
            'identifier' => 'test@pemda.go.id',
            'ip_address' => '127.0.0.1',
            'status' => 'SUCCESS',
            'created_at' => now(),
        ]);

        $this->assertTrue(Str::isUuid($log->id), 'LoginLog ID must be a valid UUID');
        $cleanId = str_replace('-', '', $log->id);
        $versionDigit = $cleanId[12];
        $this->assertSame('7', $versionDigit, "LoginLog ID must be UUID version 7, got version {$versionDigit}");
    }

    public function test_role_id_is_valid_uuid_v7(): void
    {
        $role = \App\Models\Role::create([
            'name' => 'Test UUID Role',
            'guard_name' => 'web',
            'is_system' => false,
        ]);

        $this->assertTrue(Str::isUuid($role->id), 'Role ID must be a valid UUID');
        $cleanId = str_replace('-', '', $role->id);
        $versionDigit = $cleanId[12];
        $this->assertSame('7', $versionDigit, "Role ID must be UUID version 7, got version {$versionDigit}");
    }

    public function test_permission_id_is_valid_uuid_v7(): void
    {
        $perm = \App\Models\Permission::create([
            'name' => 'test.uuid.perm',
            'guard_name' => 'web',
            'group' => 'Test',
        ]);

        $this->assertTrue(Str::isUuid($perm->id), 'Permission ID must be a valid UUID');
        $cleanId = str_replace('-', '', $perm->id);
        $versionDigit = $cleanId[12];
        $this->assertSame('7', $versionDigit, "Permission ID must be UUID version 7, got version {$versionDigit}");
    }

    public function test_system_setting_id_is_valid_uuid_v7(): void
    {
        $setting = \App\Models\SystemSetting::create([
            'key' => 'test_uuid_setting',
            'value' => 'sample',
            'group' => 'general',
            'type' => 'string',
            'label' => 'Test Setting',
        ]);

        $this->assertTrue(Str::isUuid($setting->id), 'SystemSetting ID must be a valid UUID');
        $cleanId = str_replace('-', '', $setting->id);
        $versionDigit = $cleanId[12];
        $this->assertSame('7', $versionDigit, "SystemSetting ID must be UUID version 7, got version {$versionDigit}");
    }

    public function test_master_data_ids_are_valid_uuid_v7(): void
    {
        $unsur = \App\Models\Master\MasterUnsurSpip::create([
            'nomor' => '99',
            'nama' => 'Unsur Test UUID',
        ]);

        $this->assertTrue(Str::isUuid($unsur->id), 'MasterUnsurSpip ID must be a valid UUID');
        $cleanId = str_replace('-', '', $unsur->id);
        $this->assertSame('7', $cleanId[12], 'MasterUnsurSpip ID must be UUID version 7');

        $subUnsur = \App\Models\Master\MasterSubUnsurSpip::create([
            'unsur_spip_id' => $unsur->id,
            'nama' => 'Sub Unsur Test UUID',
        ]);

        $this->assertTrue(Str::isUuid($subUnsur->id), 'MasterSubUnsurSpip ID must be a valid UUID');
        $cleanSubId = str_replace('-', '', $subUnsur->id);
        $this->assertSame('7', $cleanSubId[12], 'MasterSubUnsurSpip ID must be UUID version 7');
        $this->assertSame($unsur->id, $subUnsur->unsur_spip_id, 'Foreign key must match parent UUID');
    }

    public function test_personal_access_token_id_is_valid_uuid_v7(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token');

        $tokenModel = $token->accessToken;
        $this->assertTrue(Str::isUuid($tokenModel->id), 'PersonalAccessToken ID must be a valid UUID');
        $cleanId = str_replace('-', '', $tokenModel->id);
        $this->assertSame('7', $cleanId[12], 'PersonalAccessToken ID must be UUID version 7');
    }

    public function test_personal_access_token_handles_legacy_non_uuid_tokens_gracefully(): void
    {
        // Must return null without throwing PostgreSQL 22P02 invalid uuid syntax exception
        $result = \App\Models\PersonalAccessToken::findToken('49|nonexistent_token_hash');
        $this->assertNull($result);

        // API request with legacy integer ID token returns 401 instead of 500
        $response = $this->withHeader('Authorization', 'Bearer 49|invalid_token')
            ->getJson('/api/users');
        $response->assertStatus(401);
    }
}
