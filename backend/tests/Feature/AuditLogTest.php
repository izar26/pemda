<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Opd;
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
                        'auditable_type',
                        'auditable_id',
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

    public function test_model_creation_automatically_records_audit_log_with_attributes(): void
    {
        $this->actingAs($this->superadmin);

        $opd = Opd::create([
            'nama' => 'Dinas Lingkungan Hidup',
            'kode' => 'DLH-01',
            'kategori' => 'Dinas',
            'kepala' => 'Dr. H. Irwan, M.Si',
            'is_active' => true,
        ]);

        $log = AuditLog::where('auditable_type', Opd::class)
            ->where('auditable_id', $opd->id)
            ->where('action', 'OPD_CREATED')
            ->first();

        $this->assertNotNull($log, 'Audit log for model creation was not recorded.');
        $this->assertEquals('Organisasi (OPD)', $log->module);
        $this->assertEquals($this->superadmin->id, $log->user_id);
        $this->assertEquals($this->superadmin->name, $log->user_name);
        $this->assertArrayHasKey('attributes', $log->context);
        $this->assertEquals('Dinas Lingkungan Hidup', $log->context['attributes']['nama']);
    }

    public function test_model_update_records_before_and_after_changes(): void
    {
        $opd = Opd::create([
            'nama' => 'Dinas Kesehatan Lama',
            'kode' => 'DINKES-01',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->actingAs($this->superadmin);

        $opd->update([
            'nama' => 'Dinas Kesehatan Baru',
            'kepala' => 'dr. Siti Rahma',
        ]);

        $log = AuditLog::where('auditable_type', Opd::class)
            ->where('auditable_id', $opd->id)
            ->where('action', 'OPD_UPDATED')
            ->latest('id')
            ->first();

        $this->assertNotNull($log, 'Audit log for model update was not recorded.');
        $this->assertArrayHasKey('changes', $log->context);

        $changes = $log->context['changes'];
        $this->assertEquals('Dinas Kesehatan Lama', $changes['nama']['old']);
        $this->assertEquals('Dinas Kesehatan Baru', $changes['nama']['new']);
        $this->assertNull($changes['kepala']['old']);
        $this->assertEquals('dr. Siti Rahma', $changes['kepala']['new']);
    }

    public function test_model_update_with_zero_changes_does_not_create_duplicate_log(): void
    {
        $opd = Opd::create([
            'nama' => 'Badan Keuangan Aset Daerah',
            'kode' => 'BKAD-01',
            'kategori' => 'Badan',
            'is_active' => true,
        ]);

        $initialCount = AuditLog::where('auditable_type', Opd::class)
            ->where('auditable_id', $opd->id)
            ->count();

        // Perform save with identical data (zero-change)
        $opd->nama = 'Badan Keuangan Aset Daerah';
        $opd->save();

        $newCount = AuditLog::where('auditable_type', Opd::class)
            ->where('auditable_id', $opd->id)
            ->count();

        $this->assertEquals($initialCount, $newCount, 'Zero change update should not create duplicate log.');
    }

    public function test_model_deletion_records_full_snapshot(): void
    {
        $opd = Opd::create([
            'nama' => 'Dinas Pertanian',
            'kode' => 'DISTAN-01',
            'kategori' => 'Dinas',
            'kepala' => 'Ir. Sudirman',
            'is_active' => true,
        ]);

        $opdId = $opd->id;
        $this->actingAs($this->superadmin);

        $opd->delete();

        $log = AuditLog::where('auditable_type', Opd::class)
            ->where('auditable_id', $opdId)
            ->where('action', 'OPD_DELETED')
            ->first();

        $this->assertNotNull($log, 'Audit log for model deletion was not recorded.');
        $this->assertArrayHasKey('snapshot', $log->context);
        $this->assertEquals('Dinas Pertanian', $log->context['snapshot']['nama']);
        $this->assertEquals('DISTAN-01', $log->context['snapshot']['kode']);
        $this->assertEquals('Ir. Sudirman', $log->context['snapshot']['kepala']);
    }

    public function test_sensitive_fields_are_redacted(): void
    {
        $user = User::factory()->create([
            'email' => 'operator@pemda.go.id',
            'password' => bcrypt('Secret123!'),
        ]);

        $this->actingAs($this->superadmin);

        $user->update([
            'password' => bcrypt('NewSecret456!'),
            'name' => 'Nama Operator Diperbarui',
        ]);

        $log = AuditLog::where('auditable_type', User::class)
            ->where('auditable_id', $user->id)
            ->where('action', 'USER_UPDATED')
            ->first();

        $this->assertNotNull($log);
        $this->assertArrayHasKey('changes', $log->context);

        $changes = $log->context['changes'];
        $this->assertArrayHasKey('password', $changes);
        $this->assertEquals('***REDACTED***', $changes['password']['old']);
        $this->assertEquals('***REDACTED***', $changes['password']['new']);
        $this->assertStringNotContainsString('NewSecret456!', json_encode($log->context));
    }

    public function test_audit_logs_are_immutable(): void
    {
        $log = AuditLog::create([
            'user_name' => 'System Tester',
            'action' => 'SYSTEM_INIT',
            'module' => 'Sistem',
            'description' => 'Inisialisasi sistem',
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        $this->expectException(\LogicException::class);
        $log->update(['description' => 'Mencoba meretas log']);
    }

    public function test_audit_log_deletion_is_forbidden(): void
    {
        $log = AuditLog::create([
            'user_name' => 'System Tester',
            'action' => 'SYSTEM_INIT',
            'module' => 'Sistem',
            'description' => 'Inisialisasi sistem',
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        $this->expectException(\LogicException::class);
        $log->delete();
    }

    public function test_login_success_and_failure_are_recorded_in_audit_logs(): void
    {
        // 1. Failed login attempt
        $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'WrongPassword!',
        ])->assertStatus(422);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'AUTH_LOGIN_FAILED',
            'module' => 'Autentikasi',
        ]);

        // 2. Successful login attempt
        $this->postJson('/api/auth/login', [
            'identifier' => 'admin@pemda.go.id',
            'password' => 'password',
        ])->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'AUTH_LOGIN_SUCCESS',
            'module' => 'Autentikasi',
            'user_id' => $this->superadmin->id,
        ]);
    }

    public function test_logout_is_recorded_in_audit_logs(): void
    {
        $token = $this->superadmin->createToken('test-session')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout')
            ->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'AUTH_LOGOUT',
            'module' => 'Autentikasi',
            'user_id' => $this->superadmin->id,
        ]);
    }

    public function test_role_permission_changes_are_recorded_in_audit_logs(): void
    {
        $token = $this->superadmin->createToken('test-admin')->plainTextToken;

        $role = Role::create([
            'name' => 'Auditor Custom',
            'guard_name' => 'web',
            'is_system' => false,
        ]);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/roles/' . $role->id, [
                'name' => 'Auditor Custom',
                'description' => 'Role auditor yang diperbarui izinnya',
                'permissions' => ['audit.view', 'users.view'],
            ])
            ->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'ROLE_PERMISSIONS_UPDATED',
            'module' => 'Peran & Izin',
            'auditable_type' => Role::class,
            'auditable_id' => $role->id,
        ]);
    }

    public function test_user_reset_2fa_is_recorded_in_audit_logs(): void
    {
        $token = $this->superadmin->createToken('test-admin')->plainTextToken;

        $targetUser = User::factory()->create([
            'email' => 'target.2fa@pemda.go.id',
            'status' => 'active',
            'two_factor_secret' => 'SECRET123',
            'two_factor_confirmed_at' => now(),
        ]);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/users/{$targetUser->id}/reset-2fa")
            ->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'USER_RESET_2FA',
            'module' => 'Pegawai',
            'auditable_type' => User::class,
            'auditable_id' => $targetUser->id,
        ]);
    }

    public function test_non_superadmin_cannot_see_superadmin_logs(): void
    {
        $auditorRole = Role::firstOrCreate(
            ['name' => 'Auditor', 'guard_name' => 'web'],
            ['is_system' => false]
        );
        $auditorRole->syncPermissions(['audit.view']);

        $auditor = User::factory()->create([
            'name' => 'Petugas Audit',
            'email' => 'auditor@pemda.go.id',
            'status' => 'active',
        ]);
        $auditor->assignRole('Auditor');
        $auditorToken = $auditor->createToken('test-auditor')->plainTextToken;

        // 1. Create a log performed by Superadmin
        AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => $this->superadmin->name,
            'user_email' => $this->superadmin->email,
            'action' => 'OPD_CREATE',
            'module' => 'Perangkat Daerah',
            'description' => 'Superadmin membuat OPD baru',
            'created_at' => now(),
        ]);

        // 2. Create a log performed by regular staff
        AuditLog::create([
            'user_id' => $this->staffWithoutPerm->id,
            'user_name' => $this->staffWithoutPerm->name,
            'user_email' => $this->staffWithoutPerm->email,
            'action' => 'OPD_UPDATE',
            'module' => 'Perangkat Daerah',
            'description' => 'Staf memperbarui kontak OPD',
            'created_at' => now(),
        ]);

        // 3. Auditor requests audit logs
        $responseAuditor = $this->withHeader('Authorization', 'Bearer ' . $auditorToken)
            ->getJson('/api/audit-logs');

        $responseAuditor->assertStatus(200);
        $auditorDescriptions = collect($responseAuditor->json('data'))->pluck('description')->all();
        $this->assertContains('Staf memperbarui kontak OPD', $auditorDescriptions);
        $this->assertNotContains('Superadmin membuat OPD baru', $auditorDescriptions);

        // 4. Superadmin requests audit logs
        app('auth')->forgetGuards();
        $superadminToken = $this->superadmin->createToken('test-super')->plainTextToken;
        $responseSuper = $this->withHeader('Authorization', 'Bearer ' . $superadminToken)
            ->getJson('/api/audit-logs');

        $responseSuper->assertStatus(200);
        $superDescriptions = collect($responseSuper->json('data'))->pluck('description')->all();
        $this->assertContains('Superadmin membuat OPD baru', $superDescriptions);
        $this->assertContains('Staf memperbarui kontak OPD', $superDescriptions);
    }
}
