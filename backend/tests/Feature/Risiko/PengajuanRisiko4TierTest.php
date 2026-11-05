<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksOperasionalItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PengajuanRisiko4TierTest extends TestCase
{
    use RefreshDatabase;

    protected User $operatorUser;

    protected User $kepalaOpdUser;

    protected User $otherKepalaOpdUser;

    protected User $auditorUser;

    protected User $pengawasUser;

    protected Opd $opd;

    protected Opd $otherOpd;

    protected PeriodePenilaian $activePeriode;

    protected MasterSumberData $sumberData;

    protected TujuanPenilaian $tujuan;

    protected SasaranPenilaian $sasaran;

    protected IndikatorPenilaian $indikator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Pendidikan',
            'kode' => 'Disdik',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->otherOpd = Opd::create([
            'nama' => 'Dinas Sosial',
            'kode' => 'Dinsos',
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

        // Tier 1: Operator OPD
        $this->operatorUser = User::factory()->create([
            'name' => 'Operator Disdik',
            'email' => 'operator.disdik@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->operatorUser->assignRole('OPD');

        // Tier 2: Kepala OPD (Executive with opd_id)
        $this->kepalaOpdUser = User::factory()->create([
            'name' => 'Kepala Dinas Pendidikan',
            'email' => 'kadis.disdik@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->kepalaOpdUser->assignRole('Executive');

        // Other Kepala OPD (from Dinsos)
        $this->otherKepalaOpdUser = User::factory()->create([
            'name' => 'Kepala Dinas Sosial',
            'email' => 'kadis.dinsos@pemda.go.id',
            'opd_id' => $this->otherOpd->id,
            'status' => 'active',
        ]);
        $this->otherKepalaOpdUser->assignRole('Executive');

        // Tier 3: Auditor
        $this->auditorUser = User::factory()->create([
            'name' => 'Auditor Muda Disdik',
            'email' => 'auditor.disdik@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser->assignRole('Auditor');

        // Tier 4: Pengawas (Inspektorat)
        $this->pengawasUser = User::factory()->create([
            'name' => 'Pengawas APIP Utama',
            'email' => 'pengawas.apip@pemda.go.id',
            'status' => 'active',
        ]);
        $this->pengawasUser->assignRole('Inspektorat');

        // Master Data & Planning Data Setup
        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra Dinas Pendidikan 2024-2029',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'T.1',
            'tujuan' => 'Meningkatkan Mutu Pendidikan Dasar',
        ]);

        $this->sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'kode_sasaran' => 'S.1',
            'sasaran' => 'Pemerataan Akses Sarpras Sekolah',
        ]);

        $this->indikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kode_indikator' => 'I.1',
            'indikator' => 'Persentase Sekolah Standar Pelayanan Minimal',
        ]);

        // Assign Auditor
        AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser->id,
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);

        // Complete 2B
        $konteks = KonteksPenilaian::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
        ]);
        $konteks->sasarans()->attach([$this->sasaran->id]);
        $konteks->indikators()->attach([$this->indikator->id]);

        // Complete 2C
        $operasional = KonteksOperasional::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ]);
        KonteksOperasionalItem::create([
            'konteks_operasional_id' => $operasional->id,
            'jenis' => 'program',
            'kode' => '1.01',
            'nama' => 'Program Pengelolaan Pendidikan',
            'urutan' => 1,
        ]);
    }

    public function test_operator_can_submit_to_kepala_opd(): void
    {
        Sanctum::actingAs($this->operatorUser);

        $res = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'catatan' => 'Mohon persetujuan dari Kepala OPD.',
        ]);

        $res->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();
        $this->assertNotNull($submission);
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);
        $this->assertEquals($this->operatorUser->id, $submission->submitted_by);
    }

    public function test_kepala_opd_can_reject_internal_submission_with_mandatory_notes(): void
    {
        Sanctum::actingAs($this->operatorUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // 1. Rejection without catatan fails validation
        Sanctum::actingAs($this->kepalaOpdUser);
        $failRes = $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'rejected',
            'catatan' => '',
        ]);
        $failRes->assertStatus(422);

        // 2. Rejection with valid note succeeds
        $res = $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'rejected',
            'catatan' => 'Sasaran strategis masih kurang spesifik pada sarpras 3T.',
        ]);
        $res->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_OPERATOR, $submission->current_tier);

        // Operator is unlocked and can edit again
        Sanctum::actingAs($this->operatorUser);
        $editRes = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);
        $editRes->assertStatus(201);
    }

    public function test_unauthorized_user_cannot_act_as_kepala_opd(): void
    {
        Sanctum::actingAs($this->operatorUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // Other Kepala OPD (from different OPD) tries to approve
        Sanctum::actingAs($this->otherKepalaOpdUser);
        $res = $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ]);
        $res->assertStatus(403);
    }

    public function test_kepala_opd_approve_forwards_to_auditor(): void
    {
        Sanctum::actingAs($this->operatorUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        Sanctum::actingAs($this->kepalaOpdUser);
        $res = $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
            'catatan' => 'Draf internal telah divalidasi, teruskan ke Auditor Pengawas.',
        ]);
        $res->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_AUDITOR, $submission->current_tier);
        $this->assertEquals($this->kepalaOpdUser->id, $submission->kepala_opd_id);
        $this->assertNotNull($submission->kepala_opd_approved_at);
    }

    public function test_auditor_reject_returns_to_kepala_opd_and_operator_locked_until_delegated(): void
    {
        Sanctum::actingAs($this->operatorUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ])->assertStatus(200);

        // Auditor rejects Form 2B
        Sanctum::actingAs($this->auditorUser);
        $rejectRes = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'rejected',
            'catatan_revisi' => 'Target indikator terlalu rendah.',
        ]);
        $rejectRes->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);

        // Operator CANNOT edit yet
        Sanctum::actingAs($this->operatorUser);
        $blockedEdit = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);
        $blockedEdit->assertStatus(403);

        // Kepala OPD delegates to Operator
        Sanctum::actingAs($this->kepalaOpdUser);
        $delegateRes = $this->postJson("/api/risiko/pengajuan/{$submission->id}/delegate-operator", [
            'catatan' => 'Perbaiki target indikator seperti diminta auditor.',
        ]);
        $delegateRes->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_OPERATOR, $submission->current_tier);

        // Operator CAN now edit
        Sanctum::actingAs($this->operatorUser);
        $allowedEdit = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);
        $allowedEdit->assertStatus(201);
    }

    public function test_complete_4_tier_happy_path_to_final_approval(): void
    {
        // Tier 1: Operator submits to Kepala OPD
        Sanctum::actingAs($this->operatorUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);

        // Tier 2: Kepala OPD reviews and approves (forward to Auditor)
        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_AUDITOR, $submission->current_tier);

        // Tier 3: Auditor reviews and approves both 2B and 2C
        Sanctum::actingAs($this->auditorUser);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_PENGAWAS, $submission->current_tier);
        $this->assertNotNull($submission->auditor_reviewed_at);

        // Tier 4: Pengawas reviews and approves both 2B and 2C
        Sanctum::actingAs($this->pengawasUser);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_APPROVED, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_COMPLETED, $submission->current_tier);
        $this->assertEquals($this->pengawasUser->id, $submission->pengawas_id);
        $this->assertNotNull($submission->pengawas_approved_at);
        $this->assertNotNull($submission->approved_at);
    }

    public function test_pengawas_reject_and_auditor_forward_or_resubmit(): void
    {
        // Fast-forward to Pengawas tier
        Sanctum::actingAs($this->operatorUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        Sanctum::actingAs($this->kepalaOpdUser);
        $this->postJson("/api/risiko/pengajuan/{$submission->id}/review-kepala", [
            'status' => 'approved',
        ])->assertStatus(200);

        Sanctum::actingAs($this->auditorUser);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_PENGAWAS, $submission->current_tier);

        // Pengawas rejects Form 2C
        Sanctum::actingAs($this->pengawasUser);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2c',
            'status' => 'rejected',
            'catatan_revisi' => 'Kesesuaian dokumen Renstra dan Renja belum sinkron.',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_AUDITOR, $submission->current_tier);

        // Path A: Auditor can clarify and resubmit directly back to Pengawas
        Sanctum::actingAs($this->auditorUser);
        $resubmitRes = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/resubmit-pengawas", [
            'catatan' => 'Sinkronisasi telah dicek pada lampiran Renja halaman 14.',
        ]);
        $resubmitRes->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_PENGAWAS, $submission->current_tier);

        // Pengawas rejects again
        Sanctum::actingAs($this->pengawasUser);
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/review-pengawas", [
            'form_code' => '2c',
            'status' => 'rejected',
            'catatan_revisi' => 'Harus ada penyesuaian langsung di Form 2C.',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS, $submission->status);

        // Path B: Auditor forwards revision down to Kepala OPD
        Sanctum::actingAs($this->auditorUser);
        $forwardRes = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/forward-revision", [
            'catatan' => 'Mohon disesuaikan bersama tim perencana dinas.',
        ]);
        $forwardRes->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR, $submission->status);
        $this->assertEquals(PengajuanPenilaianRisiko::TIER_KEPALA_OPD, $submission->current_tier);
    }
}
