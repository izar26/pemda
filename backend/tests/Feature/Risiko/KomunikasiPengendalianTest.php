<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\KomunikasiPengendalianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use App\Services\Risiko\Handlers\KomunikasiPengendalian8Handler;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\SeedsRisikoPrerequisites;
use Tests\TestCase;

class KomunikasiPengendalianTest extends TestCase
{
    use RefreshDatabase;
    use SeedsRisikoPrerequisites;

    protected Opd $opd;

    protected Opd $otherOpd;

    protected PeriodePenilaian $periode;

    protected User $opdUser;

    protected User $otherOpdUser;

    protected User $auditorUser;

    protected IdentifikasiRisikoOpdItem $priorityItem;

    protected AnalisisRisiko $priorityAnalysis;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Bina Marga',
            'kode' => 'DBM',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->otherOpd = Opd::create([
            'nama' => 'Dinas Kesehatan',
            'kode' => 'DINKES',
            'kategori' => 'Dinas',
            'is_active' => true,
        ]);

        $this->periode = PeriodePenilaian::create([
            'nama_periode' => '2026',
            'tahun_penilaian' => '2026',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2030-12-31',
            'status' => 'aktif',
        ]);

        $this->opdUser = User::factory()->create(['opd_id' => $this->opd->id]);
        $this->opdUser->assignRole('OPD');

        $this->otherOpdUser = User::factory()->create(['opd_id' => $this->otherOpd->id]);
        $this->otherOpdUser->assignRole('OPD');

        $this->auditorUser = User::factory()->create();
        $this->auditorUser->assignRole('Auditor');

        AuditorOpdAssignment::create([
            'opd_id' => $this->opd->id,
            'auditor_id' => $this->auditorUser->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_active' => true,
        ]);

        $doc = IdentifikasiRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ]);

        // Priority risk: residual (3, 4) -> score 18 (> 9)
        $this->priorityItem = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $doc->id,
            'kode_risiko' => 'RSO.001',
            'pernyataan_risiko' => 'Kerusakan Jalan Utama',
            'kategori_risiko' => 'Operasional',
            'pemilik_risiko' => 'Bidang Jalan',
        ]);

        $this->priorityAnalysis = AnalisisRisiko::create([
            'risiko_opd_item_id' => $this->priorityItem->id,
            'kriteria_kemungkinan' => 'Frekuensi',
            'inheren_kemungkinan' => 4,
            'kriteria_dampak' => 'Keuangan',
            'inheren_dampak' => 4,
            'residual_kriteria_kemungkinan' => 'Frekuensi',
            'residual_kemungkinan' => 3,
            'residual_kriteria_dampak' => 'Keuangan',
            'residual_dampak' => 4,
            'pengendalian_ada' => false,
            'rencana_tindak' => 'Perbaikan aspal berkala',
        ]);

        TindakPengendalianRisiko::create([
            'analisis_risiko_id' => $this->priorityAnalysis->id,
            'celah_pengendalian' => 'Jadwal belum tersusun',
            'penanggung_jawab' => 'PPTK Pemeliharaan',
            'target_waktu' => 'Triwulan II 2026',
            'treated_kemungkinan' => 2,
            'treated_dampak' => 2,
        ]);

        // Low risk: residual (1, 2) -> score 2 (<= 9)
        $lowItem = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $doc->id,
            'kode_risiko' => 'RSO.002',
            'pernyataan_risiko' => 'Keterlambatan Surat',
            'kategori_risiko' => 'Administrasi',
            'pemilik_risiko' => 'Sekretariat',
        ]);

        AnalisisRisiko::create([
            'risiko_opd_item_id' => $lowItem->id,
            'kriteria_kemungkinan' => 'Frekuensi',
            'inheren_kemungkinan' => 2,
            'kriteria_dampak' => 'Operasional',
            'inheren_dampak' => 2,
            'residual_kriteria_kemungkinan' => 'Frekuensi',
            'residual_kemungkinan' => 1,
            'residual_kriteria_dampak' => 'Operasional',
            'residual_dampak' => 2,
            'pengendalian_ada' => false,
            'rencana_tindak' => 'Arsip digital',
        ]);

        $this->seedPrerequisitesBefore((string) $this->opd->id, (string) $this->periode->id, '8');
    }

    public function test_opd_can_list_komunikasi_pengendalian_with_prefilled_target_waktu(): void
    {
        Sanctum::actingAs($this->opdUser);

        $response = $this->getJson("/api/risiko/komunikasi-pengendalian?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}");

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.kode_risiko', 'RSO.001')
            ->assertJsonPath('data.0.rencana_waktu', 'Triwulan II 2026')
            ->assertJsonPath('data.0.rencana_tindak', 'Perbaikan aspal berkala')
            ->assertJsonPath('data.0.complete', false);
    }

    public function test_opd_can_save_komunikasi_pengendalian(): void
    {
        Sanctum::actingAs($this->opdUser);

        $payload = [
            'media_komunikasi' => 'Rapat Koordinasi Lapangan',
            'penyedia_informasi' => 'PPTK Pemeliharaan Jalan',
            'penerima_informasi' => 'Kepala Dinas & Tim Teknis',
            'rencana_waktu' => 'Triwulan II 2026',
            'realisasi_waktu' => '15 Mei 2026',
            'keterangan' => 'Dilakukan evaluasi mingguan',
        ];

        $response = $this->putJson("/api/risiko/komunikasi-pengendalian/3b/{$this->priorityItem->id}", $payload);

        $response->assertOk()
            ->assertJsonPath('message', 'Pengkomunikasian pengendalian tersimpan.')
            ->assertJsonPath('data.media_komunikasi', 'Rapat Koordinasi Lapangan')
            ->assertJsonPath('data.complete', true);

        $this->assertDatabaseHas('komunikasi_pengendalian_risikos', [
            'analisis_risiko_id' => $this->priorityAnalysis->id,
            'media_komunikasi' => 'Rapat Koordinasi Lapangan',
            'penyedia_informasi' => 'PPTK Pemeliharaan Jalan',
            'penerima_informasi' => 'Kepala Dinas & Tim Teknis',
            'rencana_waktu' => 'Triwulan II 2026',
        ]);
    }

    public function test_tenant_isolation_on_komunikasi_pengendalian(): void
    {
        Sanctum::actingAs($this->otherOpdUser);

        $this->putJson("/api/risiko/komunikasi-pengendalian/3b/{$this->priorityItem->id}", [
            'media_komunikasi' => 'Hacked Media',
            'penyedia_informasi' => 'Bad Actor',
            'penerima_informasi' => 'Target',
            'rencana_waktu' => 'Now',
        ])->assertForbidden();

        $this->getJson("/api/risiko/komunikasi-pengendalian?opd_id={$this->opd->id}&periode_penilaian_id={$this->periode->id}")
            ->assertForbidden();
    }

    public function test_handler_completeness_and_polymorphic_review_for_form_8(): void
    {
        $handler = app(KomunikasiPengendalian8Handler::class);

        // Before fill: incomplete
        $this->assertFalse($handler->isComplete($this->opd->id, $this->periode->id));

        // Save complete data
        KomunikasiPengendalianRisiko::create([
            'analisis_risiko_id' => $this->priorityAnalysis->id,
            'media_komunikasi' => 'Sosialisasi SOP',
            'penyedia_informasi' => 'Kasie Jalan',
            'penerima_informasi' => 'Kontraktor',
            'rencana_waktu' => 'Triwulan II',
        ]);

        $this->assertTrue($handler->isComplete($this->opd->id, $this->periode->id));

        // Review data via polymorphic endpoint
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'auditor_id' => $this->auditorUser->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
        ]);

        PengajuanPenilaianRisikoItem::create([
            'pengajuan_id' => $submission->id,
            'form_code' => '8',
            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
        ]);

        Sanctum::actingAs($this->auditorUser);
        $reviewResponse = $this->getJson("/api/pengawasan/review-risiko/{$submission->id}/forms/8");

        $reviewResponse->assertOk()
            ->assertJsonPath('data.0.media_komunikasi', 'Sosialisasi SOP')
            ->assertJsonPath('data.0.penerima_informasi', 'Kontraktor');
    }
}
