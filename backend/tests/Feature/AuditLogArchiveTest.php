<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\AuditLogArchive;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit\AuditArchiveService;
use Database\Seeders\RbacSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuditLogArchiveTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $auditorUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);
        $this->seed(SystemSettingSeeder::class);

        $this->superadmin = User::factory()->create([
            'email' => 'superadmin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->auditorUser = User::factory()->create([
            'email' => 'auditor@pemda.go.id',
            'status' => 'active',
        ]);
        $auditorRole = Role::firstOrCreate(
            ['name' => 'Auditor', 'guard_name' => 'web'],
            ['is_system' => false]
        );
        $auditorRole->syncPermissions(['audit.view']);
        $this->auditorUser->assignRole('Auditor');
    }

    public function test_superadmin_can_view_archive_list(): void
    {
        AuditLogArchive::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'USER_CREATE',
            'module' => 'Pegawai',
            'description' => 'Membuat pegawai arsip masa lalu',
            'created_at' => now()->subMonths(6),
            'archived_at' => now(),
            'archived_by' => $this->superadmin->id,
        ]);

        $token = $this->superadmin->createToken('test-super')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/audit-logs/archives');

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

        $this->assertCount(1, $response->json('data'));
    }

    public function test_non_superadmin_cannot_view_archive_list(): void
    {
        $token = $this->auditorUser->createToken('test-auditor')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/audit-logs/archives');

        $response->assertStatus(403);
    }

    public function test_archive_and_purge_moves_logs_from_active_to_archive(): void
    {
        // 1. Create an old active log (120 days ago)
        $oldLog = AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'SYSTEM_CONFIG_OLD',
            'module' => 'Pengaturan Sistem',
            'description' => 'Konfigurasi lama yang sudah lampau',
            'created_at' => now()->subDays(120),
        ]);

        // 2. Create a recent active log (5 days ago)
        $recentLog = AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'SYSTEM_CONFIG_RECENT',
            'module' => 'Pengaturan Sistem',
            'description' => 'Konfigurasi terkini',
            'created_at' => now()->subDays(5),
        ]);

        $service = app(AuditArchiveService::class);
        $result = $service->archiveAndPurge(daysOlderThan: 30, archivedBy: $this->superadmin);

        $this->assertEquals(1, $result['archived_count']);

        // Check active table: old log is gone, recent log remains
        $this->assertDatabaseMissing('audit_logs', ['id' => $oldLog->id]);
        $this->assertDatabaseHas('audit_logs', ['id' => $recentLog->id]);

        // Check archive table: old log is archived with original_audit_id
        $this->assertDatabaseHas('audit_log_archives', [
            'original_audit_id' => $oldLog->id,
            'action' => 'SYSTEM_CONFIG_OLD',
            'archived_by' => $this->superadmin->id,
        ]);
    }

    public function test_superadmin_can_trigger_archive_purge_via_api(): void
    {
        // Create an old active log
        AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'USER_IMPORT_OLD',
            'module' => 'Pegawai',
            'description' => 'Import batch pegawai lama',
            'created_at' => now()->subDays(100),
        ]);

        $token = $this->superadmin->createToken('test-super')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/audit-logs/archive-purge', [
                'days' => 60,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('archived_count', 1);
    }

    public function test_non_superadmin_cannot_trigger_archive_purge(): void
    {
        $token = $this->auditorUser->createToken('test-auditor')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/audit-logs/archive-purge', [
                'days' => 60,
            ]);

        $response->assertStatus(403);
    }

    public function test_superadmin_can_archive_specific_ids_with_exclusions(): void
    {
        $log1 = AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'LOGIN_1',
            'module' => 'Autentikasi',
            'description' => 'Log 1 mau diarsipkan',
            'created_at' => now(),
        ]);

        $log2 = AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'LOGIN_2',
            'module' => 'Autentikasi',
            'description' => 'Log 2 dikecualikan (jangan diarsipkan)',
            'created_at' => now(),
        ]);

        $token = $this->superadmin->createToken('test-super')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/audit-logs/archive-purge', [
                'ids' => [$log1->id, $log2->id],
                'exclude_ids' => [$log2->id],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('archived_count', 1);

        $this->assertDatabaseMissing('audit_logs', ['id' => $log1->id]);
        $this->assertDatabaseHas('audit_logs', ['id' => $log2->id]);
        $this->assertDatabaseHas('audit_log_archives', ['original_audit_id' => $log1->id]);
    }

    public function test_superadmin_can_archive_by_filter_with_exclusions(): void
    {
        $authLog1 = AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'LOGIN_A',
            'module' => 'Autentikasi',
            'description' => 'Auth log 1',
            'created_at' => now(),
        ]);

        $authLog2 = AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'LOGIN_B',
            'module' => 'Autentikasi',
            'description' => 'Auth log 2 dikecualikan',
            'created_at' => now(),
        ]);

        $userLog = AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'USER_CREATE',
            'module' => 'Pegawai',
            'description' => 'User log modul lain',
            'created_at' => now(),
        ]);

        $token = $this->superadmin->createToken('test-super')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/audit-logs/archive-purge', [
                'filters' => [
                    'module' => 'Autentikasi',
                ],
                'exclude_ids' => [$authLog2->id],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('archived_count', 1);

        $this->assertDatabaseMissing('audit_logs', ['id' => $authLog1->id]);
        $this->assertDatabaseHas('audit_logs', ['id' => $authLog2->id]);
        $this->assertDatabaseHas('audit_logs', ['id' => $userLog->id]);
    }

    public function test_archive_records_are_strictly_immutable_at_eloquent_level(): void
    {
        $archive = AuditLogArchive::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'TAMPER_TEST',
            'module' => 'Keamanan',
            'description' => 'Catatan uji proteksi kubah arsip',
            'created_at' => now()->subMonths(3),
            'archived_at' => now(),
        ]);

        // 1. Attempting update via Eloquent throws LogicException
        $this->expectException(\LogicException::class);
        $archive->update(['description' => 'Percobaan modifikasi ilegal']);
    }

    public function test_archive_records_cannot_be_deleted_via_eloquent(): void
    {
        $archive = AuditLogArchive::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'DELETE_TEST',
            'module' => 'Keamanan',
            'description' => 'Catatan uji hapus kubah arsip',
            'created_at' => now()->subMonths(3),
            'archived_at' => now(),
        ]);

        // 2. Attempting delete via Eloquent throws LogicException
        $this->expectException(\LogicException::class);
        $archive->delete();
    }

    public function test_stats_endpoint_returns_lifecycle_data(): void
    {
        AuditLog::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'STATS_ACTIVE',
            'module' => 'Sistem',
            'description' => 'Log aktif',
            'created_at' => now(),
        ]);

        AuditLogArchive::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'STATS_ARCHIVED',
            'module' => 'Sistem',
            'description' => 'Log arsip',
            'created_at' => now()->subYear(),
            'archived_at' => now(),
        ]);

        $token = $this->superadmin->createToken('test-super')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/audit-logs/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'active_logs_count',
                    'archived_logs_count',
                    'oldest_active_log',
                    'newest_active_log',
                    'last_archived_at',
                ],
            ]);

        $this->assertGreaterThanOrEqual(1, $response->json('data.active_logs_count'));
        $this->assertGreaterThanOrEqual(1, $response->json('data.archived_logs_count'));
    }

    public function test_postgresql_trigger_prevents_raw_sql_tampering(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Trigger test requires PostgreSQL.');
        }

        $archive = AuditLogArchive::create([
            'user_id' => $this->superadmin->id,
            'user_name' => 'Superadmin',
            'action' => 'RAW_TAMPER_TEST',
            'module' => 'Keamanan',
            'description' => 'Uji proteksi trigger PostgreSQL',
            'created_at' => now()->subMonths(3),
            'archived_at' => now(),
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessage('Pelanggaran Integritas: Catatan pada kubah audit_log_archives bersifat permanen');
        DB::table('audit_log_archives')->where('id', $archive->id)->delete();
    }

    public function test_non_superadmin_cannot_view_lifecycle_stats(): void
    {
        $token = $this->auditorUser->createToken('test-auditor')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/audit-logs/stats')
            ->assertStatus(403);
    }

    public function test_empty_filters_payload_is_rejected_instead_of_falling_back_to_retention_purge(): void
    {
        $oldLog = AuditLog::create([
            'user_name' => 'Sistem',
            'action' => 'OLD_LOG',
            'module' => 'Sistem',
            'description' => 'Log lama yang tidak boleh ikut terarsip',
            'created_at' => now()->subDays(200),
        ]);

        $token = $this->superadmin->createToken('test-super')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/audit-logs/archive-purge', ['filters' => ['module' => '', 'search' => '']])
            ->assertStatus(422);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/audit-logs/archive-purge', ['ids' => []])
            ->assertStatus(422);

        $this->assertDatabaseHas('audit_logs', ['id' => $oldLog->id]);
    }

    public function test_cutoff_date_archives_only_logs_strictly_before_that_date(): void
    {
        $before = AuditLog::create([
            'user_name' => 'Sistem',
            'action' => 'BEFORE_CUTOFF',
            'module' => 'Sistem',
            'description' => 'Sebelum cutoff',
            'created_at' => now()->subDays(11)->setTime(23, 0),
        ]);

        $onCutoffDay = AuditLog::create([
            'user_name' => 'Sistem',
            'action' => 'ON_CUTOFF',
            'module' => 'Sistem',
            'description' => 'Tepat di hari cutoff',
            'created_at' => now()->subDays(10)->setTime(9, 0),
        ]);

        $result = app(AuditArchiveService::class)->archiveAndPurge(
            archivedBy: $this->superadmin,
            cutoffDate: now()->subDays(10)->toDateString()
        );

        $this->assertSame(1, $result['archived_count']);
        $this->assertDatabaseMissing('audit_logs', ['id' => $before->id]);
        $this->assertDatabaseHas('audit_logs', ['id' => $onCutoffDay->id]);
    }

    public function test_archiving_same_ids_twice_never_duplicates_archive_rows(): void
    {
        $log = AuditLog::create([
            'user_name' => 'Sistem',
            'action' => 'ONCE_ONLY',
            'module' => 'Sistem',
            'description' => 'Harus terarsip satu kali',
            'created_at' => now(),
        ]);

        $service = app(AuditArchiveService::class);
        $this->assertSame(1, $service->archiveByIds([$log->id, $log->id], [], $this->superadmin));
        $this->assertSame(0, $service->archiveByIds([$log->id], [], $this->superadmin));

        $this->assertSame(1, DB::table('audit_log_archives')->where('original_audit_id', $log->id)->count());
    }
}
