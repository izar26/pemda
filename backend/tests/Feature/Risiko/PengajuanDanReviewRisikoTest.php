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
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PengajuanDanReviewRisikoTest extends TestCase
{
    use RefreshDatabase;

    protected User $opdUser;
    protected User $auditorUser;
    protected User $otherAuditorUser;
    protected Opd $opd;
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
            'nama' => 'Dinas Kesehatan',
            'kode' => 'Dinkes',
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

        $this->opdUser = User::factory()->create([
            'name' => 'Operator Dinkes',
            'email' => 'dinkes@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->opdUser->assignRole('OPD');

        $this->auditorUser = User::factory()->create([
            'name' => 'Auditor Pembina 1',
            'email' => 'auditor1@pemda.go.id',
            'status' => 'active',
        ]);
        $this->auditorUser->assignRole('Auditor');

        $this->otherAuditorUser = User::factory()->create([
            'name' => 'Auditor Lain',
            'email' => 'auditor2@pemda.go.id',
            'status' => 'active',
        ]);
        $this->otherAuditorUser->assignRole('Auditor');

        $this->sumberData = MasterSumberData::create([
            'nama' => 'Renstra Dinas Kesehatan 2024-2029',
            'urutan' => 1,
            'is_active' => true,
        ]);

        $this->tujuan = TujuanPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'kode_tujuan' => 'T.1',
            'tujuan' => 'Meningkatkan Derajat Kesehatan Masyarakat',
        ]);

        $this->sasaran = SasaranPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'kode_sasaran' => 'S.1',
            'sasaran' => 'Menurunkan Angka Kematian Ibu dan Bayi',
        ]);

        $this->indikator = IndikatorPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_penilaian_id' => $this->sasaran->id,
            'kode_indikator' => 'I.1',
            'indikator' => 'Angka Kematian Ibu per 100.000 Kelahiran Hidup',
        ]);
    }

    /**
     * Helper to complete Form 2B for the OPD.
     */
    protected function completeForm2B(): KonteksPenilaian
    {
        $konteks = KonteksPenilaian::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'nama_pemda' => 'Pemerintah Kabupaten',
            'nama_kepala' => 'dr. Budi Santoso',
            'status' => 'ditetapkan',
        ]);

        $konteks->sasarans()->attach($this->sasaran->id);
        $konteks->indikators()->attach($this->indikator->id);

        return $konteks;
    }

    /**
     * Helper to complete Form 2C for the OPD.
     */
    protected function completeForm2C(): KonteksOperasional
    {
        $operasional = KonteksOperasional::create([
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'status' => 'draft',
        ]);

        KonteksOperasionalItem::create([
            'konteks_operasional_id' => $operasional->id,
            'parent_id' => null,
            'jenis' => 'program',
            'kode' => '1',
            'nama' => 'Program Pelayanan Kesehatan Dasar',
            'urutan' => 1,
        ]);

        return $operasional;
    }

    /**
     * Helper to assign auditor to OPD.
     */
    protected function assignAuditorToOpd(): AuditorOpdAssignment
    {
        return AuditorOpdAssignment::create([
            'auditor_id' => $this->auditorUser->id,
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'is_active' => true,
        ]);
    }

    public function test_opd_without_auditor_cannot_store_form_2b(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString('belum memiliki Auditor Pengawas', $response->json('message'));
    }

    public function test_opd_with_auditor_can_store_form_2b(): void
    {
        $this->assignAuditorToOpd();
        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $response->assertStatus(201);
    }

    public function test_opd_cannot_submit_if_forms_are_incomplete(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B(); // Only Form 2B completed, 2C is still missing!

        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('wajib dilengkapi terlebih dahulu', $response->json('message'));
    }

    public function test_opd_can_submit_when_all_forms_are_complete(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();

        Sanctum::actingAs($this->opdUser);

        $response = $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
            'catatan' => 'Mohon ditinjau lembar kerja risiko Dinkes 2024.',
        ]);

        $response->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();
        $this->assertNotNull($submission);
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_SUBMITTED, $submission->status);
        $this->assertEquals($this->auditorUser->id, $submission->auditor_id);
    }

    public function test_opd_cannot_edit_forms_when_submission_is_locked(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();

        // Submit to lock it
        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        // Attempt to edit Form 2B while under review
        $response = $this->postJson('/api/risiko/konteks-strategis', [
            'periode_penilaian_id' => $this->activePeriode->id,
            'opd_id' => $this->opd->id,
            'sumber_data_id' => $this->sumberData->id,
            'tujuan_penilaian_id' => $this->tujuan->id,
            'sasaran_ids' => [$this->sasaran->id],
            'indikator_ids' => [$this->indikator->id],
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString('sedang dalam proses pemeriksaan', $response->json('message'));
    }

    public function test_unassigned_auditor_cannot_review_opd(): void
    {
        $this->assignAuditorToOpd(); // Assigned to auditorUser, NOT otherAuditorUser
        $this->completeForm2B();
        $this->completeForm2C();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // Attempt review by otherAuditorUser
        Sanctum::actingAs($this->otherAuditorUser);
        $response = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ]);

        $response->assertStatus(403);
    }

    public function test_auditor_reject_without_notes_is_blocked(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        Sanctum::actingAs($this->auditorUser);
        $response = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'rejected',
            'catatan_revisi' => '', // Empty notes!
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Catatan revisi wajib diisi', $response->json('message'));
    }

    public function test_auditor_can_reject_form_with_notes_and_opd_can_edit_again(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        // Auditor rejects Form 2C with notes
        Sanctum::actingAs($this->auditorUser);
        $reviewRes = $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'rejected',
            'catatan_revisi' => 'Target pada sub kegiatan vaksinasi belum dicantumkan.',
        ]);

        $reviewRes->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_REVISION_REQUESTED, $submission->status);

        // OPD can now edit Form 2C to fix it
        Sanctum::actingAs($this->opdUser);
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

    public function test_all_forms_approved_sets_submission_to_approved(): void
    {
        $this->assignAuditorToOpd();
        $this->completeForm2B();
        $this->completeForm2C();

        Sanctum::actingAs($this->opdUser);
        $this->postJson('/api/risiko/pengajuan/submit', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->activePeriode->id,
        ])->assertStatus(200);

        $submission = PengajuanPenilaianRisiko::where('opd_id', $this->opd->id)->first();

        Sanctum::actingAs($this->auditorUser);

        // Approve Form 2B
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2b',
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_IN_REVIEW, $submission->status);

        // Approve Form 2C
        $this->postJson("/api/pengawasan/review-risiko/{$submission->id}/item", [
            'form_code' => '2c',
            'status' => 'approved',
        ])->assertStatus(200);

        $submission->refresh();
        $this->assertEquals(PengajuanPenilaianRisiko::STATUS_APPROVED, $submission->status);
        $this->assertNotNull($submission->approved_at);
        $this->assertEquals($this->auditorUser->id, $submission->approved_by);
    }
}
