<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\TindakPengendalianRisiko;
use App\Models\User;
use App\Services\Risiko\Handlers\PetaRisiko7Handler;
use App\Services\Risiko\PetaRisikoService;
use App\Services\Risiko\Registry\RiskFormRegistry;
use App\Services\Risiko\SkalaRisikoService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PetaRisikoTest extends TestCase
{
    use RefreshDatabase;

    protected Opd $opd;

    protected PeriodePenilaian $periode;

    protected User $opdUser;

    protected User $auditorUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->opd = Opd::create([
            'nama' => 'Dinas Pekerjaan Umum',
            'kode' => 'DPU',
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

        $this->opdUser = User::factory()->create([
            'opd_id' => $this->opd->id,
        ]);
        $this->opdUser->assignRole('OPD');

        $this->auditorUser = User::factory()->create();
        $this->auditorUser->assignRole('Auditor');

        AuditorOpdAssignment::create([
            'opd_id' => $this->opd->id,
            'auditor_id' => $this->auditorUser->id,
            'periode_penilaian_id' => $this->periode->id,
            'is_active' => true,
        ]);
    }

    public function test_peta_risiko_service_computes_5x5_matrices_and_rekapitulasi(): void
    {
        $doc = IdentifikasiRisikoOpd::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
        ]);

        // Item 1: Inherent (5, 5) -> Skor 25 (Merah), Residual (3, 3) -> Skor 15 (Kuning)
        $item1 = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $doc->id,
            'kode_risiko' => 'RSO.001',
            'pernyataan_risiko' => 'Risiko 1',
            'kategori_risiko' => 'Strategis',
            'pemilik_risiko' => 'Kepala Dinas',
        ]);
        $ar1 = AnalisisRisiko::create([
            'risiko_opd_item_id' => $item1->id,
            'kriteria_kemungkinan' => 'Kriteria K',
            'inheren_kemungkinan' => 5,
            'kriteria_dampak' => 'Kriteria D',
            'inheren_dampak' => 5,
            'residual_kriteria_kemungkinan' => 'Kriteria K',
            'residual_kemungkinan' => 3,
            'residual_kriteria_dampak' => 'Kriteria D',
            'residual_dampak' => 3,
            'pengendalian_ada' => false,
            'rencana_tindak' => 'Mitigasi 1',
        ]);
        // Priority risk -> Treated: (1, 1) -> Skor 1 (Hijau Tua)
        TindakPengendalianRisiko::create([
            'analisis_risiko_id' => $ar1->id,
            'celah_pengendalian' => 'Celah 1',
            'penanggung_jawab' => 'Kabid',
            'target_waktu' => '1 tahun',
            'treated_kemungkinan' => 1,
            'treated_dampak' => 1,
        ]);

        // Item 2: Inherent (4, 4) -> Skor 22 (Oranye), Residual (2, 2) -> Skor 7 (Hijau Muda)
        $item2 = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $doc->id,
            'kode_risiko' => 'RSO.002',
            'pernyataan_risiko' => 'Risiko 2',
            'kategori_risiko' => 'Strategis',
            'pemilik_risiko' => 'Kepala Dinas',
        ]);
        AnalisisRisiko::create([
            'risiko_opd_item_id' => $item2->id,
            'kriteria_kemungkinan' => 'Kriteria K',
            'inheren_kemungkinan' => 4,
            'kriteria_dampak' => 'Kriteria D',
            'inheren_dampak' => 4,
            'residual_kriteria_kemungkinan' => 'Kriteria K',
            'residual_kemungkinan' => 2,
            'residual_kriteria_dampak' => 'Kriteria D',
            'residual_dampak' => 2,
            'pengendalian_ada' => false,
        ]);

        /** @var PetaRisikoService $service */
        $service = app(PetaRisikoService::class);
        $result = $service->generate((string) $this->opd->id, (string) $this->periode->id, $this->opdUser);

        $this->assertArrayHasKey('matrices', $result);
        $this->assertArrayHasKey('rekapitulasi', $result);
        $this->assertCount(25, $result['matrices']['inherent']['cells']);
        $this->assertCount(25, $result['matrices']['residual']['cells']);
        $this->assertCount(25, $result['matrices']['treated']['cells']);

        // Check Inherent: 1 in Merah (5,5), 1 in Oranye (4,4)
        $rekap = collect($result['rekapitulasi'])->keyBy('zona');
        $this->assertSame(1, $rekap[SkalaRisikoService::ZONA_MERAH]['inherent_count']);
        $this->assertSame(1, $rekap[SkalaRisikoService::ZONA_ORANYE]['inherent_count']);
        $this->assertSame(0, $rekap[SkalaRisikoService::ZONA_KUNING]['inherent_count']);

        // Check Residual: 1 in Kuning (3,3), 1 in Hijau Muda (2,2)
        $this->assertSame(0, $rekap[SkalaRisikoService::ZONA_MERAH]['residual_count']);
        $this->assertSame(1, $rekap[SkalaRisikoService::ZONA_KUNING]['residual_count']);
        $this->assertSame(1, $rekap[SkalaRisikoService::ZONA_HIJAU_MUDA]['residual_count']);

        // Check Treated: 1 in Hijau Tua (1,1)
        $this->assertSame(1, $rekap[SkalaRisikoService::ZONA_HIJAU_TUA]['treated_count']);
    }

    public function test_api_endpoint_peta_risiko_returns_ok(): void
    {
        Sanctum::actingAs($this->opdUser);
        $response = $this->getJson(
            '/api/risiko/peta-risiko?opd_id='.$this->opd->id.'&periode_penilaian_id='.$this->periode->id
        );

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'opd' => ['id', 'nama'],
                    'periode' => ['id', 'tahun_penilaian'],
                    'matrices' => ['inherent', 'residual', 'treated'],
                    'rekapitulasi',
                    'total_all',
                ],
            ]);
    }

    public function test_review_form_7_polymorphic_handler(): void
    {
        $submission = PengajuanPenilaianRisiko::create([
            'opd_id' => $this->opd->id,
            'periode_penilaian_id' => $this->periode->id,
            'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
            'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
            'auditor_id' => $this->auditorUser->id,
            'submitted_at' => now(),
            'submitted_by' => $this->opdUser->id,
        ]);

        PengajuanPenilaianRisikoItem::create([
            'pengajuan_id' => $submission->id,
            'form_code' => '7',
            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
        ]);

        Sanctum::actingAs($this->auditorUser);
        $response = $this->getJson(
            "/api/pengawasan/review-risiko/{$submission->id}/forms/7"
        );

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'matrices',
                    'rekapitulasi',
                ],
            ]);
    }

    public function test_registry_contains_form_7(): void
    {
        /** @var RiskFormRegistry $registry */
        $registry = app(RiskFormRegistry::class);

        $this->assertTrue($registry->has('7'));
        $handler = $registry->get('7');
        $this->assertInstanceOf(PetaRisiko7Handler::class, $handler);
        $this->assertSame('7', $handler->getFormCode());
        $this->assertSame(10, $handler->getOrder());
    }
}
