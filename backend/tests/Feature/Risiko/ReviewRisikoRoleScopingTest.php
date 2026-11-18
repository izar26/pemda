<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewRisikoRoleScopingTest extends TestCase
{
    use RefreshDatabase;

    protected PeriodePenilaian $periode;

    protected Opd $opdDisdik;

    protected Opd $opdDinkes;

    protected Opd $opdDinsos;

    protected User $superadmin;

    protected User $bupati;

    protected User $kepalaDisdik;

    protected User $evaluator1;

    protected User $evaluator2;

    protected User $pengawas1;

    protected User $pengawas2;

    protected PengajuanPenilaianRisiko $subDisdik;

    protected PengajuanPenilaianRisiko $subDinkes;

    protected PengajuanPenilaianRisiko $subDinsos;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->periode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $this->opdDisdik = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'DISDIK',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->opdDinkes = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'DINKES',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->opdDinsos = Opd::create([
            'nama' => 'Dinas Sosial',
            'kode' => 'DINSOS',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->superadmin = User::factory()->create([
            'name' => 'Superadmin',
            'email' => 'superadmin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->bupati = User::factory()->create([
            'name' => 'Bupati',
            'email' => 'bupati@pemda.go.id',
            'jabatan' => 'Bupati',
            'opd_id' => null,
            'status' => 'active',
        ]);
        $this->bupati->assignRole('Executive');

        $this->kepalaDisdik = User::factory()->create([
            'name' => 'Kepala Disdik',
            'email' => 'kepala.disdik@pemda.go.id',
            'opd_id' => $this->opdDisdik->id,
            'status' => 'active',
        ]);
        $this->kepalaDisdik->assignRole('Executive');

        $this->pengawas1 = User::factory()->create([
            'name' => 'Pengawas 1',
            'email' => 'pengawas1@pemda.go.id',
            'status' => 'active',
        ]);
        $this->pengawas1->assignRole('Koordinator Pengawas');

        $this->pengawas2 = User::factory()->create([
            'name' => 'Pengawas 2',
            'email' => 'pengawas2@pemda.go.id',
            'status' => 'active',
        ]);
        $this->pengawas2->assignRole('Koordinator Pengawas');

        $this->evaluator1 = User::factory()->create([
            'name' => 'Evaluator 1',
            'email' => 'evaluator1@pemda.go.id',
            'status' => 'active',
        ]);
        $this->evaluator1->assignRole('Evaluator / Reviewer');

        $this->evaluator2 = User::factory()->create([
            'name' => 'Evaluator 2',
            'email' => 'evaluator2@pemda.go.id',
            'status' => 'active',
        ]);
        $this->evaluator2->assignRole('Evaluator / Reviewer');

        // Pengawas 1 assigns Evaluator 1 -> Disdik & Dinkes
        AuditorOpdAssignment::create([
            'auditor_id' => $this->evaluator1->id,
            'opd_id' => $this->opdDisdik->id,
            'periode_penilaian_id' => $this->periode->id,
            'assigned_by' => $this->pengawas1->id,
            'is_active' => true,
        ]);
        AuditorOpdAssignment::create([
            'auditor_id' => $this->evaluator1->id,
            'opd_id' => $this->opdDinkes->id,
            'periode_penilaian_id' => $this->periode->id,
            'assigned_by' => $this->pengawas1->id,
            'is_active' => true,
        ]);

        // Pengawas 2 assigns Evaluator 2 -> Dinsos
        AuditorOpdAssignment::create([
            'auditor_id' => $this->evaluator2->id,
            'opd_id' => $this->opdDinsos->id,
            'periode_penilaian_id' => $this->periode->id,
            'assigned_by' => $this->pengawas2->id,
            'is_active' => true,
        ]);

        $this->subDisdik = $this->createSubmission($this->opdDisdik, $this->evaluator1, PengajuanPenilaianRisiko::TIER_KEPALA_OPD, PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA);
        $this->subDinkes = $this->createSubmission($this->opdDinkes, $this->evaluator1, PengajuanPenilaianRisiko::TIER_AUDITOR, PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR);
        $this->subDinsos = $this->createSubmission($this->opdDinsos, $this->evaluator2, PengajuanPenilaianRisiko::TIER_PENGAWAS, PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS);
    }

    protected function createSubmission(Opd $opd, User $auditor, string $tier, string $status): PengajuanPenilaianRisiko
    {
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'auditor_id' => $auditor->id,
            'current_tier' => $tier,
            'status' => $status,
            'submitted_at' => now(),
        ]);

        foreach (['2b', '2c'] as $code) {
            PengajuanPenilaianRisikoItem::create([
                'pengajuan_id' => $submission->id,
                'form_code' => $code,
                'current_tier' => $tier,
                'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
            ]);
        }

        return $submission;
    }

    public function test_kepala_opd_only_sees_own_opd_and_cannot_access_other_opd(): void
    {
        Sanctum::actingAs($this->kepalaDisdik);

        $list = $this->getJson('/api/pengawasan/review-risiko');
        $list->assertStatus(200);
        $ids = collect($list->json('data'))->pluck('id')->all();
        $this->assertEquals([$this->opdDisdik->id], $ids);

        // Can open own OPD submission
        $this->getJson("/api/pengawasan/review-risiko/{$this->subDisdik->id}")
            ->assertStatus(200);

        // Cannot open another OPD's submission
        $this->getJson("/api/pengawasan/review-risiko/{$this->subDinkes->id}")
            ->assertStatus(403);
    }

    public function test_executive_without_opd_cannot_access_review_risiko(): void
    {
        Sanctum::actingAs($this->bupati);

        $this->getJson('/api/pengawasan/review-risiko')->assertStatus(403);
        $this->getJson("/api/pengawasan/review-risiko/{$this->subDisdik->id}")->assertStatus(403);
    }

    public function test_evaluator_only_sees_and_accesses_assigned_opds(): void
    {
        Sanctum::actingAs($this->evaluator1);

        $list = $this->getJson('/api/pengawasan/review-risiko');
        $list->assertStatus(200);
        $ids = collect($list->json('data'))->pluck('id')->sort()->values()->all();
        $expected = collect([$this->opdDisdik->id, $this->opdDinkes->id])->sort()->values()->all();
        $this->assertEquals($expected, $ids);

        // Can open assigned OPD submission
        $this->getJson("/api/pengawasan/review-risiko/{$this->subDinkes->id}")
            ->assertStatus(200);

        // Cannot open unassigned OPD submission (Dinsos belongs to Evaluator 2)
        $this->getJson("/api/pengawasan/review-risiko/{$this->subDinsos->id}")
            ->assertStatus(403);
    }

    public function test_pengawas_only_sees_and_approves_opds_assigned_by_themselves(): void
    {
        // Pengawas 1 only sees Disdik & Dinkes (Evaluator 1's OPDs assigned by Pengawas 1)
        Sanctum::actingAs($this->pengawas1);
        $list1 = $this->getJson('/api/pengawasan/review-risiko');
        $list1->assertStatus(200);
        $ids1 = collect($list1->json('data'))->pluck('id')->sort()->values()->all();
        $expected1 = collect([$this->opdDisdik->id, $this->opdDinkes->id])->sort()->values()->all();
        $this->assertEquals($expected1, $ids1);

        // Pengawas 1 cannot view or approve Dinsos (Evaluator 2 assigned by Pengawas 2)
        $this->getJson("/api/pengawasan/review-risiko/{$this->subDinsos->id}")
            ->assertStatus(403);

        $this->postJson("/api/pengawasan/review-risiko/{$this->subDinsos->id}/review-pengawas", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(403);

        // Pengawas 2 only sees Dinsos and CAN approve Dinsos
        Sanctum::actingAs($this->pengawas2);
        $list2 = $this->getJson('/api/pengawasan/review-risiko');
        $list2->assertStatus(200);
        $ids2 = collect($list2->json('data'))->pluck('id')->all();
        $this->assertEquals([$this->opdDinsos->id], $ids2);

        $this->getJson("/api/pengawasan/review-risiko/{$this->subDisdik->id}")
            ->assertStatus(403);

        $this->postJson("/api/pengawasan/review-risiko/{$this->subDinsos->id}/review-pengawas", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);
    }

    public function test_superadmin_sees_all_opds_globally(): void
    {
        Sanctum::actingAs($this->superadmin);

        $list = $this->getJson('/api/pengawasan/review-risiko');
        $list->assertStatus(200);
        $this->assertCount(3, $list->json('data'));
    }

    public function test_pending_counts_are_scoped_per_pengawas_evaluator_and_kepala_opd(): void
    {
        // Kepala Disdik: 1 pending (Disdik at TIER_KEPALA_OPD)
        Sanctum::actingAs($this->kepalaDisdik);
        $countsKepala = $this->getJson('/api/risiko/pengajuan/pending-counts')->assertStatus(200)->json('data');
        $this->assertEquals(1, $countsKepala['kepala_opd_pending']);
        $this->assertEquals(1, $countsKepala['my_pending_total']);

        // Evaluator 1: 1 pending (Dinkes at TIER_AUDITOR)
        Sanctum::actingAs($this->evaluator1);
        $countsEval1 = $this->getJson('/api/risiko/pengajuan/pending-counts')->assertStatus(200)->json('data');
        $this->assertEquals(1, $countsEval1['auditor_pending']);
        $this->assertEquals(1, $countsEval1['my_pending_total']);

        // Pengawas 1: 0 pending at TIER_PENGAWAS (Dinsos belongs to Pengawas 2)
        Sanctum::actingAs($this->pengawas1);
        $countsP1 = $this->getJson('/api/risiko/pengajuan/pending-counts')->assertStatus(200)->json('data');
        $this->assertEquals(0, $countsP1['pengawas_pending']);
        $this->assertEquals(0, $countsP1['my_pending_total']);

        // Pengawas 2: 1 pending at TIER_PENGAWAS (Dinsos)
        Sanctum::actingAs($this->pengawas2);
        $countsP2 = $this->getJson('/api/risiko/pengajuan/pending-counts')->assertStatus(200)->json('data');
        $this->assertEquals(1, $countsP2['pengawas_pending']);
        $this->assertEquals(1, $countsP2['my_pending_total']);
    }

    public function test_rbac_prevents_cross_tier_privilege_escalation(): void
    {
        // Kepala OPD cannot review Auditor tier or Pengawas tier
        Sanctum::actingAs($this->kepalaDisdik);
        $this->postJson("/api/pengawasan/review-risiko/{$this->subDinkes->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(403);
        $this->postJson("/api/pengawasan/review-risiko/{$this->subDinsos->id}/review-pengawas", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(403);

        // Evaluator cannot approve Pengawas tier
        Sanctum::actingAs($this->evaluator2);
        $this->postJson("/api/pengawasan/review-risiko/{$this->subDinsos->id}/review-pengawas", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(403);

        // Pengawas cannot approve Auditor tier directly
        Sanctum::actingAs($this->pengawas1);
        $this->postJson("/api/pengawasan/review-risiko/{$this->subDinkes->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(403);
    }
}
