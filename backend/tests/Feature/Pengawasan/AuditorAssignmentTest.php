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
            ->assertJsonPath('message', 'Penugasan evaluator berhasil disimpan.');

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

    public function test_cannot_assign_opd_already_assigned_to_another_auditor(): void
    {
        // Auditor 1 is assigned to Dinkes
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDinkes->id,
        ]);

        // Auditor 2 tries to be assigned to Dinkes
        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-auditor', [
                'auditor_id' => $this->auditorUser2->id,
                'opd_ids' => [$this->opdDinkes->id],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['opd_ids']);
    }

    public function test_cannot_sync_with_opd_assigned_to_another_auditor(): void
    {
        // Auditor 1 is assigned to Dinkes
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser1->id,
            'opd_id' => $this->opdDinkes->id,
        ]);

        // Auditor 2 is assigned to Disdik
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser2->id,
            'opd_id' => $this->opdDisdik->id,
        ]);

        // Auditor 2 tries to update assignments to include Dinkes (owned by Auditor 1)
        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->putJson("/api/pengawasan/penugasan-auditor/{$this->auditorUser2->id}", [
                'opd_ids' => [$this->opdDisdik->id, $this->opdDinkes->id],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['opd_ids']);
    }

    public function test_evaluator_endpoint_and_permission_work_properly(): void
    {
        $evaluatorUser = User::factory()->create([
            'name' => 'Fungsional Evaluator 1',
            'email' => 'evaluator_test1@pemda.go.id',
            'status' => 'active',
        ]);
        $evaluatorUser->assignRole('Evaluator / Reviewer');

        $response = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'meta']);

        $evaluatorsResponse = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/evaluators');

        $evaluatorsResponse->assertStatus(200);
        $names = collect($evaluatorsResponse->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Fungsional Evaluator 1'));

        $statsResponse = $this->actingAs($this->inspektoratUser, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/stats');

        $statsResponse->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_two_pengawas_and_three_evaluators_isolation_flow(): void
    {
        $pengawas1 = User::factory()->create([
            'name' => 'Pengawas Satu',
            'email' => 'pengawas1_flow@pemda.go.id',
            'status' => 'active',
        ]);
        $pengawas1->assignRole('Koordinator Pengawas');

        $pengawas2 = User::factory()->create([
            'name' => 'Pengawas Dua',
            'email' => 'pengawas2_flow@pemda.go.id',
            'status' => 'active',
        ]);
        $pengawas2->assignRole('Koordinator Pengawas');

        $evaluator1 = User::factory()->create([
            'name' => 'Evaluator Alpha',
            'email' => 'evaluator_alpha@pemda.go.id',
            'status' => 'active',
        ]);
        $evaluator1->assignRole('Evaluator / Reviewer');

        $evaluator2 = User::factory()->create([
            'name' => 'Evaluator Beta',
            'email' => 'evaluator_beta@pemda.go.id',
            'status' => 'active',
        ]);
        $evaluator2->assignRole('Evaluator / Reviewer');

        $evaluator3 = User::factory()->create([
            'name' => 'Evaluator Gamma',
            'email' => 'evaluator_gamma@pemda.go.id',
            'status' => 'active',
        ]);
        $evaluator3->assignRole('Evaluator / Reviewer');

        // 1. Kondisi awal: ketiga evaluator belum ditugaskan ke OPD mana pun.
        // Data harus muncul di kedua pengawas (tabel dan dropdown).
        $resPengawas1Initial = $this->actingAs($pengawas1, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator');
        $resPengawas1Initial->assertStatus(200);
        $p1Names = collect($resPengawas1Initial->json('data'))->pluck('name');
        $this->assertTrue($p1Names->contains('Evaluator Alpha'));
        $this->assertTrue($p1Names->contains('Evaluator Beta'));
        $this->assertTrue($p1Names->contains('Evaluator Gamma'));

        $resPengawas2Initial = $this->actingAs($pengawas2, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator');
        $resPengawas2Initial->assertStatus(200);
        $p2Names = collect($resPengawas2Initial->json('data'))->pluck('name');
        $this->assertTrue($p2Names->contains('Evaluator Alpha'));
        $this->assertTrue($p2Names->contains('Evaluator Beta'));
        $this->assertTrue($p2Names->contains('Evaluator Gamma'));

        $dropdownP2Initial = $this->actingAs($pengawas2, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/evaluators');
        $dropdownP2Initial->assertStatus(200);
        $p2DropdownNames = collect($dropdownP2Initial->json('data'))->pluck('name');
        $this->assertTrue($p2DropdownNames->contains('Evaluator Alpha'));

        // 2. Pengawas 1 menugaskan Evaluator Alpha ke Dinkes
        $assignResponse = $this->actingAs($pengawas1, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-evaluator', [
                'auditor_id' => $evaluator1->id,
                'opd_ids' => [$this->opdDinkes->id],
            ]);
        $assignResponse->assertStatus(201);

        // Pengawas 1 masih melihat Evaluator Alpha (milik dirinya) dan evaluator bebas lainnya
        $resPengawas1After = $this->actingAs($pengawas1, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator');
        $p1AfterNames = collect($resPengawas1After->json('data'))->pluck('name');
        $this->assertTrue($p1AfterNames->contains('Evaluator Alpha'));
        $this->assertTrue($p1AfterNames->contains('Evaluator Beta'));
        $this->assertTrue($p1AfterNames->contains('Evaluator Gamma'));

        // Pengawas 2: Evaluator Alpha TIDAK BOLEH MUNCUL (di tabel maupun dropdown)
        $resPengawas2After = $this->actingAs($pengawas2, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator');
        $p2AfterNames = collect($resPengawas2After->json('data'))->pluck('name');
        $this->assertFalse($p2AfterNames->contains('Evaluator Alpha'), 'Evaluator Alpha seharusnya tidak muncul di tabel Pengawas 2');
        $this->assertTrue($p2AfterNames->contains('Evaluator Beta'));
        $this->assertTrue($p2AfterNames->contains('Evaluator Gamma'));

        $dropdownP2After = $this->actingAs($pengawas2, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/evaluators');
        $p2AfterDropdownNames = collect($dropdownP2After->json('data'))->pluck('name');
        $this->assertFalse($p2AfterDropdownNames->contains('Evaluator Alpha'), 'Evaluator Alpha seharusnya tidak muncul di dropdown Pengawas 2');
        $this->assertTrue($p2AfterDropdownNames->contains('Evaluator Beta'));
        $this->assertTrue($p2AfterDropdownNames->contains('Evaluator Gamma'));

        // 3. Pengawas 2 mencoba membajak/menugaskan Evaluator Alpha -> Ditolak (422)
        $stealResponse = $this->actingAs($pengawas2, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-evaluator', [
                'auditor_id' => $evaluator1->id,
                'opd_ids' => [$this->opdDisdik->id],
            ]);
        $stealResponse->assertStatus(422)
            ->assertJsonValidationErrors(['auditor_id']);

        // 4. Pengawas 2 mencoba mencabut penugasan Evaluator Alpha -> Ditolak (403)
        $deleteUnauthorized = $this->actingAs($pengawas2, 'sanctum')
            ->deleteJson("/api/pengawasan/penugasan-evaluator/evaluator/{$evaluator1->id}");
        $deleteUnauthorized->assertStatus(403);

        // 5. Pengawas 1 mencabut seluruh penugasan Evaluator Alpha
        $releaseResponse = $this->actingAs($pengawas1, 'sanctum')
            ->deleteJson("/api/pengawasan/penugasan-evaluator/evaluator/{$evaluator1->id}");
        $releaseResponse->assertStatus(200);

        // 6. Sekarang Evaluator Alpha kembali berstatus unassigned -> Muncul lagi di Pengawas 2!
        $resPengawas2Released = $this->actingAs($pengawas2, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator');
        $p2ReleasedNames = collect($resPengawas2Released->json('data'))->pluck('name');
        $this->assertTrue($p2ReleasedNames->contains('Evaluator Alpha'), 'Evaluator Alpha harus muncul kembali setelah dicabut oleh Pengawas 1');

        $dropdownP2Released = $this->actingAs($pengawas2, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/evaluators');
        $p2ReleasedDropdownNames = collect($dropdownP2Released->json('data'))->pluck('name');
        $this->assertTrue($p2ReleasedDropdownNames->contains('Evaluator Alpha'));
    }

    public function test_kpi_stats_scoped_to_current_pengawas_and_global_for_superadmin(): void
    {
        $pengawasA = User::factory()->create([
            'name' => 'Pengawas A',
            'email' => 'pengawas_a@pemda.go.id',
            'status' => 'active',
        ]);
        $pengawasA->assignRole('Koordinator Pengawas');

        $pengawasB = User::factory()->create([
            'name' => 'Pengawas B',
            'email' => 'pengawas_b@pemda.go.id',
            'status' => 'active',
        ]);
        $pengawasB->assignRole('Koordinator Pengawas');

        // Pengawas A menugaskan Auditor 1 ke Dinkes & Disdik
        $this->actingAs($pengawasA, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-evaluator', [
                'auditor_id' => $this->auditorUser1->id,
                'opd_ids' => [$this->opdDinkes->id, $this->opdDisdik->id],
            ])
            ->assertStatus(201);

        // Pengawas B menugaskan Auditor 2 ke PUPR
        $this->actingAs($pengawasB, 'sanctum')
            ->postJson('/api/pengawasan/penugasan-evaluator', [
                'auditor_id' => $this->auditorUser2->id,
                'opd_ids' => [$this->opdPupr->id],
            ])
            ->assertStatus(201);

        // Cek Stats Pengawas A
        $statsA = $this->actingAs($pengawasA, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/stats')
            ->assertStatus(200)
            ->json('data');

        $this->assertEquals(1, $statsA['total_auditor_bertugas']);
        $this->assertEquals(2, $statsA['total_opd_tercover']);
        $this->assertEquals(2, $statsA['total_penugasan_aktif']);

        // Cek Stats Pengawas B
        $statsB = $this->actingAs($pengawasB, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/stats')
            ->assertStatus(200)
            ->json('data');

        $this->assertEquals(1, $statsB['total_auditor_bertugas']);
        $this->assertEquals(1, $statsB['total_opd_tercover']);
        $this->assertEquals(1, $statsB['total_penugasan_aktif']);

        // Cek Stats Superadmin (Global Aggregate)
        $statsSuper = $this->actingAs($this->superadmin, 'sanctum')
            ->getJson('/api/pengawasan/penugasan-evaluator/stats')
            ->assertStatus(200)
            ->json('data');

        $this->assertEquals(2, $statsSuper['total_auditor_bertugas']);
        $this->assertEquals(3, $statsSuper['total_opd_tercover']);
        $this->assertEquals(3, $statsSuper['total_penugasan_aktif']);
    }
}
