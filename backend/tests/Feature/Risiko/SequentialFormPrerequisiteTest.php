<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\StatusFraudRiskAssessmentOpd;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\SeedsRisikoPrerequisites;
use Tests\TestCase;

class SequentialFormPrerequisiteTest extends TestCase
{
    use RefreshDatabase;
    use SeedsRisikoPrerequisites;

    protected Opd $opd;

    protected PeriodePenilaian $periode;

    protected User $operator;

    protected User $superadmin;

    protected User $evaluator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'DINKES',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->periode = PeriodePenilaian::create([
            'nama_periode' => 'RPJMD 2026 - 2030',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tahun_penilaian' => 2026,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2026-12-31',
            'status' => 'aktif',
        ]);

        $this->operator = User::factory()->create([
            'name' => 'Operator Dinkes',
            'email' => 'operator.dinkes@pemda.go.id',
            'opd_id' => $this->opd->id,
            'status' => 'active',
        ]);
        $this->operator->assignRole('Operator OPD');

        $this->superadmin = User::factory()->create([
            'name' => 'Superadmin',
            'email' => 'superadmin.seq@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->evaluator = User::factory()->create([
            'name' => 'Evaluator 1',
            'email' => 'evaluator.seq@pemda.go.id',
            'status' => 'active',
        ]);
        $this->evaluator->assignRole('Evaluator / Reviewer');

        AuditorOpdAssignment::create([
            'opd_id' => $this->opd->id,
            'auditor_id' => $this->evaluator->id,
            'is_active' => true,
        ]);
    }

    public function test_readiness_unlocked_forms_progresses_strictly_one_by_one_in_draft(): void
    {
        Sanctum::actingAs($this->operator);
        $query = http_build_query([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ]);

        // Initially only 2b is unlocked
        $this->getJson("/api/risiko/pengajuan/status?{$query}")
            ->assertOk()
            ->assertJsonPath('data.unlocked_forms', ['2b'])
            ->assertJsonPath('data.first_incomplete_form.code', '2b');

        // After 2b..6 are complete, 7 (auto) and 8 unlock, while 9, 10, fra remain LOCKED
        $this->seedPrerequisitesBefore((string) $this->opd->id, (string) $this->periode->id, '8', true);

        $this->getJson("/api/risiko/pengajuan/status?{$query}")
            ->assertOk()
            ->assertJsonPath('data.unlocked_forms', ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8'])
            ->assertJsonPath('data.first_incomplete_form.code', '8');

        // After 8 is complete, 9 unlocks, 10 and fra remain LOCKED
        $this->ensureForm8Complete((string) $this->opd->id, (string) $this->periode->id);

        $this->getJson("/api/risiko/pengajuan/status?{$query}")
            ->assertOk()
            ->assertJsonPath('data.unlocked_forms', ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9'])
            ->assertJsonPath('data.first_incomplete_form.code', '9');

        // After 9 is complete, 10 unlocks, fra remains LOCKED
        $this->ensureForm9Complete((string) $this->opd->id, (string) $this->periode->id);

        $this->getJson("/api/risiko/pengajuan/status?{$query}")
            ->assertOk()
            ->assertJsonPath('data.unlocked_forms', ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9', '10'])
            ->assertJsonPath('data.first_incomplete_form.code', '10');

        // After 10 is complete, fra unlocks
        $this->ensureForm10Complete((string) $this->opd->id, (string) $this->periode->id);

        $this->getJson("/api/risiko/pengajuan/status?{$query}")
            ->assertOk()
            ->assertJsonPath('data.unlocked_forms', ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9', '10', 'fra'])
            ->assertJsonPath('data.first_incomplete_form.code', 'fra');
    }

    public function test_backend_rejects_saving_form_9_10_and_fra_when_previous_form_incomplete_for_all_roles(): void
    {
        $this->seedPrerequisitesBefore((string) $this->opd->id, (string) $this->periode->id, '8', true);
        $item3b = IdentifikasiRisikoOpdItem::firstOrFail();

        // Both Operator and Superadmin must be blocked from skipping Form 8 to save Form 9, 10, or FRA
        foreach ([$this->operator, $this->superadmin] as $actor) {
            Sanctum::actingAs($actor);

            $this->putJson("/api/risiko/pemantauan-pengendalian/3b/{$item3b->id}", [
                'bentuk_pemantauan' => 'Reviu Dokumen',
                'penanggung_jawab_pemantauan' => 'Irban',
                'rencana_waktu_pemantauan' => 'Triwulan IV',
            ])->assertUnprocessable()->assertJsonValidationErrors(['prerequisite']);

            $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', [
                'opd_id' => $this->opd->id,
                'periode_penilaian_id' => $this->periode->id,
                'is_nihil' => true,
            ])->assertUnprocessable()->assertJsonValidationErrors(['prerequisite']);

            $this->postJson('/api/risiko/fra/confirm-nihil', [
                'opd_id' => $this->opd->id,
                'periode_penilaian_id' => $this->periode->id,
                'is_nihil' => true,
            ])->assertUnprocessable()->assertJsonValidationErrors(['prerequisite']);
        }

        // Complete Form 8 -> Form 9 succeeds, Form 10 still blocked
        $this->ensureForm8Complete((string) $this->opd->id, (string) $this->periode->id);
        Sanctum::actingAs($this->operator);

        $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors(['prerequisite']);

        $this->putJson("/api/risiko/pemantauan-pengendalian/3b/{$item3b->id}", [
            'bentuk_pemantauan' => 'Reviu Dokumen',
            'penanggung_jawab_pemantauan' => 'Irban',
            'rencana_waktu_pemantauan' => 'Triwulan IV',
        ])->assertOk();

        // Complete Form 9 -> Form 10 succeeds, FRA still blocked
        $this->ensureForm9Complete((string) $this->opd->id, (string) $this->periode->id);

        $this->postJson('/api/risiko/fra/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors(['prerequisite']);

        $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ])->assertOk();

        // Now FRA succeeds
        $this->postJson('/api/risiko/fra/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ])->assertOk();
    }

    public function test_backend_rejects_early_forms_2c_and_3a_when_preceding_form_incomplete(): void
    {
        Sanctum::actingAs($this->operator);

        // Cannot save 2C before 2B
        $this->postJson('/api/risiko/konteks-operasional', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'informasi_lain' => 'Test',
        ])->assertUnprocessable()->assertJsonValidationErrors(['prerequisite']);

        // Complete 2B, still cannot save 3A before 2C
        $this->ensureForm2bComplete((string) $this->opd->id, (string) $this->periode->id);
        $urusan = MasterUrusanPemerintahan::create([
            'kode' => '02',
            'nama' => 'Kesehatan',
            'is_active' => true,
            'urutan' => 1,
        ]);

        $this->postJson('/api/risiko/identifikasi-pemda/header', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'master_urusan_pemerintahan_id' => $urusan->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['prerequisite']);
    }

    public function test_post_submit_revision_mode_keeps_forms_navigable_and_allows_editing_rejected_form_even_if_earlier_rejected_form_temporarily_incomplete(): void
    {
        $this->seedPrerequisitesBefore((string) $this->opd->id, (string) $this->periode->id, 'fra', true);
        StatusFraudRiskAssessmentOpd::updateOrCreate(
            ['opd_id' => $this->opd->id, 'periode_penilaian_id' => $this->periode->id],
            ['is_nihil' => true, 'catatan' => 'Nihil', 'confirmed_at' => now()]
        );

        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'auditor_id' => $this->evaluator->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
            'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
            'submitted_at' => now(),
            'submitted_by' => $this->operator->id,
        ]);

        foreach (['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9', '10', 'fra'] as $code) {
            $isRejected = in_array($code, ['2b', '9'], true);
            PengajuanPenilaianRisikoItem::create([
                'pengajuan_id' => $submission->id,
                'form_code' => $code,
                'current_tier' => $isRejected ? PengajuanPenilaianRisiko::TIER_OPERATOR : PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                'status' => $isRejected ? PengajuanPenilaianRisikoItem::STATUS_REJECTED : PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                'status_kepala_opd' => $isRejected ? PengajuanPenilaianRisikoItem::STATUS_REJECTED : PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                'catatan_kepala_opd' => $isRejected ? 'Perbaiki' : null,
            ]);
        }

        // Simulate Form 2B temporarily becoming incomplete during revision
        KonteksPenilaian::where('opd_id', $this->opd->id)
            ->where('periode_penilaian_id', $this->periode->id)
            ->firstOrFail()
            ->indikators()
            ->detach();

        Sanctum::actingAs($this->operator);
        $query = http_build_query([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ]);

        // In post-submit revision mode, all 14 forms stay navigable in unlocked_forms
        $this->getJson("/api/risiko/pengajuan/status?{$query}")
            ->assertOk()
            ->assertJsonCount(14, 'data.unlocked_forms')
            ->assertJsonPath('data.editable_forms', ['2b', '9']);

        // Operator CAN still edit rejected Form 9 directly, while non-rejected Form 10 stays 403
        $item3b = IdentifikasiRisikoOpdItem::firstOrFail();
        $this->putJson("/api/risiko/pemantauan-pengendalian/3b/{$item3b->id}", [
            'bentuk_pemantauan' => 'Audit Lapangan',
            'penanggung_jawab_pemantauan' => 'Inspektorat',
            'rencana_waktu_pemantauan' => 'Triwulan IV',
        ])->assertOk();

        $this->postJson('/api/risiko/kejadian-risiko/confirm-nihil', [
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_nihil' => true,
        ])->assertForbidden();
    }
}
