<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PengajuanPendingCountsTest extends TestCase
{
    use RefreshDatabase;

    protected User $operatorUser;

    protected User $kepalaOpdUser;

    protected User $auditorUser;

    protected User $pengawasUser;

    protected Opd $opd;

    protected PeriodePenilaian $activePeriode;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Perhubungan',
            'kode' => 'Dishub',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->activePeriode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2024-2029',
            'tahun_mulai' => 2024,
            'tahun_akhir' => 2029,
            'tahun_penilaian' => 2024,
            'tanggal_mulai' => '2024-01-01',
            'tanggal_akhir' => '2029-12-31',
            'status' => 'aktif',
        ]);

        $this->operatorUser = User::factory()->create([
            'name' => 'Operator Dishub',
            'email' => 'operator.dishub@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->operatorUser->assignRole('OPD');

        $this->kepalaOpdUser = User::factory()->create([
            'name' => 'Kepala Dinas Perhubungan',
            'email' => 'kadis.dishub@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->kepalaOpdUser->assignRole('Executive');

        $this->auditorUser = User::factory()->create([
            'name' => 'Auditor Dishub',
            'email' => 'auditor.dishub@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser->assignRole('Auditor');

        $this->pengawasUser = User::factory()->create([
            'name' => 'Inspektur Wilayah',
            'email' => 'inspektur@pemda.go.id',
            'status' => 'active',
        ]);
        $this->pengawasUser->assignRole('Inspektorat');

        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser->id,
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);
    }

    public function test_pending_counts_for_kepala_opd_when_submitted(): void
    {
        // 1. Initial draft -> pending count 0
        Sanctum::actingAs($this->kepalaOpdUser);
        $resInitial = $this->getJson('/api/risiko/pengajuan/pending-counts');
        $resInitial->assertStatus(200);
        $this->assertEquals(0, $resInitial->json('data.kepala_opd_pending'));
        $this->assertEquals(0, $resInitial->json('data.my_pending_total'));

        // 2. Operator submits to Kepala OPD
        PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'auditor_id' => $this->auditorUser->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
            'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
            'submitted_at' => now(),
            'submitted_by' => $this->operatorUser->id,
        ]);

        // Kepala OPD now sees 1 pending task!
        $resAfterSubmit = $this->getJson('/api/risiko/pengajuan/pending-counts');
        $resAfterSubmit->assertStatus(200);
        $this->assertEquals(1, $resAfterSubmit->json('data.kepala_opd_pending'));
        $this->assertEquals(1, $resAfterSubmit->json('data.my_pending_total'));
        $this->assertCount(1, $resAfterSubmit->json('data.pending_items'));
        $this->assertEquals('review_internal', $resAfterSubmit->json('data.pending_items.0.action_type'));
        $this->assertEquals('/pengawasan/review-risiko', $resAfterSubmit->json('data.pending_items.0.url'));
    }

    public function test_pending_counts_for_auditor_and_pengawas(): void
    {
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'auditor_id' => $this->auditorUser->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
            'submitted_at' => now(),
        ]);

        // Auditor checks counts
        Sanctum::actingAs($this->auditorUser);
        $resAuditor = $this->getJson('/api/risiko/pengajuan/pending-counts');
        $resAuditor->assertStatus(200);
        $this->assertEquals(1, $resAuditor->json('data.auditor_pending'));
        $this->assertEquals(1, $resAuditor->json('data.my_pending_total'));

        // Transition to Pengawas tier
        $submission->update([
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
            'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
            'auditor_reviewed_at' => now(),
        ]);

        // Pengawas checks counts
        Sanctum::actingAs($this->pengawasUser);
        $resPengawas = $this->getJson('/api/risiko/pengajuan/pending-counts');
        $resPengawas->assertStatus(200);
        $this->assertEquals(1, $resPengawas->json('data.pengawas_pending'));
        $this->assertEquals(1, $resPengawas->json('data.my_pending_total'));
    }
}
