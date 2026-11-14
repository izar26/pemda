<?php

declare(strict_types=1);

namespace Tests\Feature\Risiko;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Services\Risiko\TindakPengendalianService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TindakPengendalianQueryTest extends TestCase
{
    use RefreshDatabase;

    public function test_hanya_analisis_lengkap_di_atas_ambang_dari_kedua_sumber_yang_prioritas(): void
    {
        $opd = Opd::create(['nama' => 'Dinas', 'kode' => 'DIN', 'kategori' => 'Dinas', 'is_active' => true]);
        $periode = PeriodePenilaian::create(['nama_periode' => '2026', 'tahun_penilaian' => '2026', 'tahun_mulai' => 2026, 'tahun_akhir' => 2030, 'tanggal_mulai' => '2026-01-01', 'tanggal_akhir' => '2030-12-31', 'status' => 'aktif']);
        $strategis = IdentifikasiRisikoOpd::create(['opd_id' => $opd->id, 'periode_penilaian_id' => $periode->id]);
        $operasional = IdentifikasiRisikoOpdOperasional::create(['opd_id' => $opd->id, 'periode_penilaian_id' => $periode->id]);
        $a = IdentifikasiRisikoOpdItem::create(['identifikasi_risiko_opd_id' => $strategis->id, 'kategori_risiko' => 'Risiko Strategis', 'pernyataan_risiko' => 'A', 'kode_risiko' => 'A']);
        $b = IdentifikasiRisikoOpdOperasionalItem::create(['identifikasi_risiko_opd_operasional_id' => $operasional->id, 'pernyataan_risiko' => 'B', 'kode_risiko' => 'B']);
        $c = IdentifikasiRisikoOpdItem::create(['identifikasi_risiko_opd_id' => $strategis->id, 'kategori_risiko' => 'Risiko Strategis', 'pernyataan_risiko' => 'C', 'kode_risiko' => 'C']);
        $common = ['kriteria_kemungkinan' => 'Frekuensi', 'kriteria_dampak' => 'Kinerja', 'inheren_kemungkinan' => 1, 'inheren_dampak' => 1, 'residual_kriteria_kemungkinan' => 'Frekuensi', 'residual_kriteria_dampak' => 'Kinerja', 'pengendalian_ada' => false];
        AnalisisRisiko::create($common + ['risiko_opd_item_id' => $a->id, 'residual_kemungkinan' => 1, 'residual_dampak' => 5]);
        AnalisisRisiko::create($common + ['risiko_operasional_item_id' => $b->id, 'residual_kemungkinan' => 1, 'residual_dampak' => 5]);
        AnalisisRisiko::create($common + ['risiko_opd_item_id' => $c->id, 'residual_kemungkinan' => 5, 'residual_dampak' => 1]);

        $rows = app(TindakPengendalianService::class)->query((string) $opd->id, (string) $periode->id)->get();
        $this->assertEqualsCanonicalizing([$a->id, $b->id], $rows->pluck('id')->all());
        $this->assertEqualsCanonicalizing(['3b', '3c'], $rows->pluck('source')->all());
    }
}
