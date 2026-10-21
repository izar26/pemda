<?php

declare(strict_types=1);

namespace Tests\Feature\Pengawasan;

use App\Models\AuditLog;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditorAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $inspektoratUser;
    protected User $auditorUser1;
    protected User $auditorUser2;
    protected User $opdUser;
    protected Opd $opdDinkes;
    protected Opd $opdDisdik;
    protected Opd $opdPupr;
    protected PeriodePenilaian $activePeriode;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->opdDinkes = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
            'kategori' => 'Dinas',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->opdDisdik = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'Disdik',
            'kategori' => 'Dinas',
            'urutan' => 2,
            'is_active' => true,
        ]);

        $this->opdPupr = Opd::create([
            'nama' => 'Dinas Pekerjaan Umum dan Penataan Ruang',
            'kode' => 'PUPR',
            'kategori' => 'Dinas',
            'urutan' => 3,
            'is_active' => true,
        ]);

        $this->superadmin = User::factory()->create([
            'email' => 'superadmin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->inspektoratUser = User::factory()->create([
            'name' => 'Irban Wilayah I',
            'email' => 'irban@pemda.go.id',
            'status' => 'active',
        ]);
        $this->inspektoratUser->assignRole('Inspektorat');

        $this->auditorUser1 = User::factory()->create([
            'name' => 'Ahmad Auditor Pratama',
            'email' => 'auditor1@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser1->assignRole('Auditor');

        $this->auditorUser2 = User::factory()->create([
            'name' => 'Budi Auditor Muda',
            'email' => 'auditor2@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser2->assignRole('Auditor');

        $this->opdUser = User::factory()->create([
            'name' => 'Staf Dinas Kesehatan',
            'email' => 'staf_dinkes@pemda.go.id',
            'opd_id' => $this->opdDinkes->id,
            'status' => 'active',
        ]);
        $this->opdUser->assignRole('OPD');

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2027,
            'tanggal_mulai' => '2027-01-02',
            'tanggal_akhir' => '2027-12-30',
            'status' => 'aktif',
        ]);
    }

    public function test_opd_cannot_access_penugasan_auditor(): void
    {
        $response = $this->actingAs($this->opdUser, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-auditor');

        $response->assertStatus(403);
    }

    public function test_inspektorat_can_view_assignments_list_and_stats(): void
    {
        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-auditor');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'meta']);

        $statsResponse = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-auditor/stats');

        $statsResponse->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_auditor_bertugas',
                    'total_opd_tercover',
                    'total_opd_belum_tercover',
                    'total_penugasan_aktif',
                    'total_opd_aktif',
                ],
            ]);
    }

    public function test_inspektorat_can_assign_auditor_to_multiple_opds(): void
    {
        $payload = [
            'auditor_id' => $this->auditorUser1->id,
            'opd_ids' => [$this->opdDinkes->id, $this->opdDisdik->id],
            'periode_penilaian_id' => $this->activePeriode->id,
            'nomor_surat_tugas' => 'ST/001/ITDA/2027',
            'tanggal_mulai' => '2027-02-01',
            'tanggal_selesai' => '2027-12-31',
            'catatan' => 'Penugasan audit SPIP dan reviu risiko strategis',
        ];

        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-auditor', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Penugasan auditor berhasil disimpan.');

        $this->assertDatabaseHas('auditor_opd_assignments', [
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDinkes->id,
            'nomor_surat_tugas' => 'ST/001/ITDA/2027',
        ]);

        $this->assertDatabaseHas('auditor_opd_assignments', [
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDisdik->id,
            'nomor_surat_tugas' => 'ST/001/ITDA/2027',
        ]);
    }

    public function test_assignment_triggers_audit_log_entry(): void
    {
        $payload = [
            'auditor_id' => $this->auditorUser2->id,
            'opd_ids' => [$this->opdPupr->id],
            'periode_penilaian_id' => $this->activePeriode->id,
            'nomor_surat_tugas' => 'ST/002/ITDA/2027',
            'catatan' => 'Audit risiko operasional PUPR',
        ];

        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-auditor', $payload);

        $response->assertStatus(201);

        // Verify that AuditLog has been written with Auditable trait
        $this->assertDatabaseHas('audit_logs', [
            'auditable_type' => AuditorOpdAssignment::class,
            'action' => 'AUDITOR_OPD_ASSIGNMENT_CREATED',
            'user_id' => $this->inspektoratUser->id,
        ]);
    }

    public function test_inspektorat_can_sync_assignments(): void
    {
        // Initial assignment to Dinkes and Disdik
        $this->actingAs($this->inspektoratUser, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-auditor', [
                'auditor_id' => $this->auditorUser1->id,
                'opd_ids' => [$this->opdDinkes->id, $this->opdDisdik->id],
            ])->assertStatus(201);

        $this->assertEquals(2, AuditorOpdAssignment::where('auditor_id', $this->auditorUser1->id)->count());

        // Sync: remove Disdik, add PUPR
        $updatePayload = [
            'opd_ids' => [$this->opdDinkes->id, $this->opdPupr->id],
            'nomor_surat_tugas' => 'ST/001-REV/ITDA/2027',
        ];

        $updateResponse = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->putJson("/api/pengawasan/penugasan-auditor/{$this->auditorUser1->id}", $updatePayload);

        $updateResponse->assertStatus(200);

        // Disdik should be removed
        $this->assertDatabaseMissing('auditor_opd_assignments', [
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDisdik->id,
        ]);

        // PUPR should now be assigned
        $this->assertDatabaseHas('auditor_opd_assignments', [
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdPupr->id,
            'nomor_surat_tugas' => 'ST/001-REV/ITDA/2027',
        ]);
    }

    public function test_inspektorat_can_delete_single_assignment(): void
    {
        $assignment = AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDinkes->id,
            'nomor_surat_tugas' => 'ST/TEST/2027',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->deleteJson("/api/pengawasan/penugasan-auditor/{$assignment->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('auditor_opd_assignments', ['id' => $assignment->id]);
    }

    public function test_inspektorat_can_delete_all_assignments_for_auditor(): void
    {
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDinkes->id,
        ]);
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDisdik->id,
        ]);

        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->deleteJson("/api/pengawasan/penugasan-auditor/auditor/{$this->auditorUser1->id}");

        $response->assertStatus(200);
        $this->assertEquals(0, AuditorOpdAssignment::where('auditor_id', $this->auditorUser1->id)->count());
    }

    public function test_auditor_can_only_see_their_own_assignments(): void
    {
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDinkes->id,
        ]);
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser2->id,
            'opd_id' => $this->opdDisdik->id,
        ]);

        // When auditor1 views, they only see themselves
        $response = $this->actingAs($this->auditorUser1, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-auditor');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->auditorUser1->id, $data[0]['id']);
    }
}
