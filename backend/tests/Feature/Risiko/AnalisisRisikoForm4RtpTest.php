<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\RootCauseAnalysis;
use App\Models\User;
use App\Services\Risiko\AnalisisRisikoService;
use App\Services\Risiko\TindakPengendalianService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalisisRisikoForm4RtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_form_4_persists_rencana_tindak_and_syncs_with_form_6(): void
    {
        $this->seed(RbacSeeder::class);

        $opd = Opd::create(['nama' => 'Dinas Pekerjaan Umum', 'kode' => 'DPU', 'kategori' => 'Dinas', 'is_active' => true]);
        $periode = PeriodePenilaian::create([
            'nama_periode' => '2026',
            'tahun_penilaian' => '2026',
            'tahun_mulai' => 2026,
            'tahun_akhir' => 2030,
            'tanggal_mulai' => '2026-01-01',
            'tanggal_akhir' => '2030-12-31',
            'status' => 'aktif',
        ]);

        $evaluator = User::factory()->create(['status' => 'active']);
        $evaluator->assignRole('Evaluator / Reviewer');
        AuditorOpdAssignment::create([
            'auditor_id' => $evaluator->id,
            'opd_id' => $opd->id,
            'periode_penilaian_id' => $periode->id,
            'is_active' => true,
        ]);

        $user = User::factory()->create(['opd_id' => $opd->id, 'status' => 'active']);
        $user->givePermissionTo(['identifikasi_risiko_opd.view', 'identifikasi_risiko_opd.edit']);

        $dokumen = IdentifikasiRisikoOpd::create(['opd_id' => $opd->id, 'periode_penilaian_id' => $periode->id]);
        $item = IdentifikasiRisikoOpdItem::create([
            'identifikasi_risiko_opd_id' => $dokumen->id,
            'kategori_risiko' => 'Risiko Strategis',
            'pernyataan_risiko' => 'Penurunan kondisi jalan',
            'kode_risiko' => 'RSO.2026.001',
        ]);

        // Complete RCA requirement
        RootCauseAnalysis::create([
            'identifikasi_risiko_opd_item_id' => $item->id,
            'akar_penyebab' => 'Kurang pengawasan berkala',
            'jenis_penyebab' => 'Man',
            'kegiatan_pengendalian' => 'Audit mutu berkala',
        ]);

        $service = app(AnalisisRisikoService::class);
        $payload = [
            'kriteria_kemungkinan' => 'Persentase Probabilitas (dlm 1 tahun)',
            'inheren_kemungkinan' => 3,
            'kriteria_dampak' => 'Penurunan reputasi',
            'inheren_dampak' => 4,
            'pengendalian_ada' => false,
            'residual_kriteria_kemungkinan' => 'Persentase Probabilitas (dlm 1 tahun)',
            'residual_kemungkinan' => 3,
            'residual_kriteria_dampak' => 'Penurunan reputasi',
            'residual_dampak' => 4,
            'rencana_tindak' => 'PPK meminta penyedia untuk melakukan perbaikan pekerjaan',
        ];

        $analysis = $service->save('3b', (string) $item->id, $payload, $user);

        // Verify Form 4 saved rencana_tindak
        $this->assertEquals('PPK meminta penyedia untuk melakukan perbaikan pekerjaan', $analysis->fresh()->rencana_tindak);

        // Verify Form 6 automatically sees the rencana_tindak saved from Form 4
        $tindakService = app(TindakPengendalianService::class);
        $queryResult = $tindakService->query((string) $opd->id, (string) $periode->id)->where('id', $item->id)->first();
        $this->assertNotNull($queryResult);
        $this->assertEquals('PPK meminta penyedia untuk melakukan perbaikan pekerjaan', $queryResult->rencana_tindak);
    }
}
